/* eslint-disable @typescript-eslint/no-explicit-any */
// src/admin/components/DeliveryManager.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    getDoc,
    onSnapshot,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Hash,
    Truck,
    MapPin,
    CalendarDays,
    Search,
    Loader2,
    ArrowRight,
    CheckCircle,
    Tag,
    Package,
} from "lucide-react";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import types
import { Order, OrderStatus, FulfillmentMethod, RepairStatus } from "@/types/order";

// Define filter status options for Delivery Manager (KitFix Delivers)
const kitFixDeliveryStatuses: RepairStatus[] = [
    "Ready for KitFix Delivery",
    "Scheduled for Delivery (KitFix)",
    "Out for Delivery",
    "Delivered to Customer",
];
const relevantStatuses: RepairStatus[] = [...kitFixDeliveryStatuses];
type DeliveryFilterStatus = RepairStatus | 'all';

const DeliveryManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<DeliveryFilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    const statusOptions: DeliveryFilterStatus[] = ['all', ...relevantStatuses];

    useEffect(() => {
        setLoading(true);

        const ordersRef = collection(db, "orders");

        const q = query(
            ordersRef,
            where('processing.status', '==', 'awaiting_fulfillment' as OrderStatus),
            where('processing.fulfillmentMethod', '==', 'delivery' as FulfillmentMethod),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("DeliveryManager: Received snapshot update.");
            const fetchedOrders = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    contactInfo: data.contactInfo || {},
                    processing: data.processing || {},
                    payment: data.payment || {},
                };
            }) as Order[];

            console.log("DeliveryManager: Fetched orders from Firestore (awaiting_fulfillment, fulfillmentMethod=delivery):", fetchedOrders);

            const relevantOrders = fetchedOrders.filter(order =>
                order.processing?.repairStatus && relevantStatuses.includes(order.processing.repairStatus)
            );

            console.log("DeliveryManager: Filtered orders by relevantStatuses:", relevantOrders);

            setOrders(relevantOrders);
            setLoading(false);
        }, (error) => {
            console.error("DeliveryManager: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for KitFix delivery orders.");
            setLoading(false);
        });

        return () => {
            console.log("DeliveryManager: Unsubscribing from snapshot listener.");
            unsubscribe();
        };
    }, [filterStatus]);

    const updateDeliveryOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for delivery update:", orderId);
                toast.error("Update Failed", { description: "Order not found." });
                return false;
            }

            const updatedProcessing = updates.processing
                ? { ...existingOrder.processing, ...updates.processing }
                : existingOrder.processing;

            const finalUpdates: Partial<Order> = {
                ...updates,
                processing: updatedProcessing,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(orderRef, finalUpdates);

            console.log(`Order ${orderId} Firestore updated.`);

            return true;
        } catch (error) {
            console.error("Error updating KitFix delivery order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    const markScheduledForKitFixDelivery = async (order: Order, scheduleDate: string) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || order.processing.repairStatus !== 'Ready for KitFix Delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting scheduling for KitFix delivery.`);
            return;
        }
        if (!scheduleDate) {
            toast.warning("Please provide a schedule date.");
            return;
        }

        const date = new Date(scheduleDate);
        if (isNaN(date.getTime())) {
            toast.error("Invalid date selected.");
            return;
        }
        const scheduledTimestamp = Timestamp.fromDate(date);

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Scheduled for Delivery (KitFix)" as RepairStatus,
                scheduledKitFixDeliveryDate: scheduledTimestamp,
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} scheduled for KitFix delivery.`);
    };

    const markOutForDelivery = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || (order.processing.repairStatus !== 'Ready for KitFix Delivery' && order.processing.repairStatus !== 'Scheduled for Delivery (KitFix)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to go out for delivery.`);
            return;
        }
        if ((order.processing.repairStatus as any) === 'Out for Delivery') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already out for delivery.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Out for Delivery" as RepairStatus,
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Out for Delivery.`);
    };

    const markDeliveredToCustomer = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || order.processing.repairStatus !== 'Out for Delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be out for delivery to be marked delivered.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "fulfilled" as OrderStatus,
                repairStatus: "Delivered to Customer" as RepairStatus,
                actualKitFixDeliveryDate: Timestamp.now(),
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Delivered and Fulfilled.`);
    };

    const filteredAndSearchedOrders = orders.filter(order => {
        if (!order.processing || !order.processing.repairStatus) return false;

        const statusMatch = filterStatus === 'all' || order.processing.repairStatus === filterStatus;

        if (!statusMatch) return false;

        const lowerSearchTerm = searchTerm.toLowerCase();
        if (lowerSearchTerm === '') return true;

        const customerName = order.contactInfo?.name?.toLowerCase() || '';
        const orderIdPartial = order.id.slice(0, 6).toLowerCase();

        return customerName.includes(lowerSearchTerm) || orderIdPartial.includes(lowerSearchTerm);
    });

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    console.log("DeliveryManager: Rendering Filtered Orders:", filteredAndSearchedOrders);

    let emptyMessage = "No orders found.";
    if (filterStatus !== 'all') {
        emptyMessage = `No "${filterStatus.replace(/_/g, ' ')}" orders found.`;
    }
    if (searchTerm) {
        emptyMessage = `No orders found matching "${searchTerm}"` + (filterStatus !== 'all' ? ` with status "${filterStatus.replace(/_/g, ' ')}".` : '.');
    }

    return (
        <div className="space-y-6">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                {/* Status Filter Dropdown (mobile friendly) */}
                <div className="w-full sm:w-auto">
                    <Select value={filterStatus} onValueChange={v => setFilterStatus(v as DeliveryFilterStatus)}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="All Delivery Orders">
                                {filterStatus === 'all'
                                    ? 'All Delivery Orders'
                                    : filterStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status === 'all'
                                        ? 'All Delivery Orders'
                                        : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Search Input */}
                <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3"
                    />
                </div>
            </div>

            {/* Order Cards */}
            {filteredAndSearchedOrders.length === 0 ? (
                <p className="text-center text-gray-500">{emptyMessage}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAndSearchedOrders.map((order) => {
                        if (!order || !order.id || !order.processing) {
                            console.warn("Skipping rendering for invalid order item:", order);
                            return null;
                        }

                        const repairStatus = order.processing.repairStatus;
                        const initialMethod = order.processing.initialMethod;
                        const fulfillmentMethod = order.processing.fulfillmentMethod;

                        return (
                            <Card key={order.id} className="rounded-2xl shadow-md">
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-jet-black">{order.contactInfo?.name || "No Name"}</h3>
                                            <p className="text-sm text-gray-500">{order.contactInfo?.email || "No Email"}</p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${repairStatus === "Delivered to Customer"
                                                ? "bg-green-100 text-green-600"
                                                : repairStatus === "Out for Delivery"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : repairStatus === "Scheduled for Delivery (KitFix)"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {repairStatus || 'Unknown Status'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-700">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-4 w-4 text-indigo-500" />
                                            <strong>Order #:</strong> {order.id.slice(0, 6).toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-700 space-y-1">
                                        {initialMethod && (
                                            <p className="text-gray-700">
                                                <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                                <strong>Initial:</strong> {initialMethod.charAt(0).toUpperCase() + initialMethod.slice(1)}
                                            </p>
                                        )}
                                        {fulfillmentMethod && (
                                            <p className="text-gray-700">
                                                <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                                <strong>Return:</strong> {fulfillmentMethod.charAt(0).toUpperCase() + fulfillmentMethod.slice(1)}
                                            </p>
                                        )}
                                        <p className="text-gray-700">
                                            <Tag className="inline mr-1 h-4 w-4 text-blue-500" />
                                            <strong>Repair:</strong> {order.repairDescription || order.repairType || "N/A"}
                                        </p>
                                        {order.notes && (
                                            <p className="text-gray-700">
                                                <Package className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Notes:</strong> {order.notes}
                                            </p>
                                        )}
                                        {order.contactInfo?.address && (
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Delivery Address:</strong> {order.contactInfo.address}
                                            </p>
                                        )}
                                        {order.processing?.preferredDate && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-purple-500" />
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate}
                                            </p>
                                        )}
                                        {order.processing?.scheduledKitFixDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Scheduled:</strong> {format(new Date(order.processing.scheduledKitFixDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {order.processing?.actualKitFixDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-green-500" />
                                                <strong>Delivered:</strong> {format(new Date(order.processing.actualKitFixDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        {repairStatus === 'Ready for KitFix Delivery' && (
                                            <>
                                                <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => { console.log(e.target.value); }} />
                                                <Button
                                                    size="sm"
                                                    variant="luxury"
                                                    onClick={() => markScheduledForKitFixDelivery(order, '2023-10-27')}
                                                    disabled={isUpdatingOrderId === order.id}
                                                >
                                                    {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Schedule Delivery
                                                </Button>
                                            </>
                                        )}

                                        {(repairStatus === 'Ready for KitFix Delivery' || repairStatus === 'Scheduled for Delivery (KitFix)') && (
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                onClick={() => markOutForDelivery(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <ArrowRight className="mr-1 h-4 w-4" /> Out for Delivery
                                            </Button>
                                        )}

                                        {repairStatus === 'Out for Delivery' && (
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                onClick={() => markDeliveredToCustomer(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Mark Delivered
                                            </Button>
                                        )}

                                        {repairStatus === 'Delivered to Customer' && (
                                            <Badge variant="default" className="capitalize">Delivered</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DeliveryManager;