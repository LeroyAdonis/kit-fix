// src/admin/components/DropoffManager.tsx
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
    Tag,
    Package
} from "lucide-react";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import types
import { Order, OrderStatus, RepairStatus } from "@/types/order";

// Define filter status options for Dropoff Manager
const dropoffInitialStatuses: RepairStatus[] = [
    "Routed to Dropoff",
    "Item Dropped Off",
    "Ready for Repair (from Dropoff)",
];
const customerPickupStatuses: RepairStatus[] = [
    "Ready for Customer Pickup",
    "Scheduled for Pickup (Customer)",
    "Picked Up by Customer",
];
const relevantStatuses: RepairStatus[] = [...dropoffInitialStatuses, ...customerPickupStatuses];
type DropoffFilterStatus = RepairStatus | 'all';


const DropoffManager: React.FC = () => {
    const [filterStatus, setFilterStatus] = useState<DropoffFilterStatus>('all');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    const statusOptions: DropoffFilterStatus[] = ['all', ...relevantStatuses];


    useEffect(() => {
        setLoading(true);

        const ordersRef = collection(db, "orders");

        const q = query(
            ordersRef,
            where('processing.status', 'in', ['in_progress', 'awaiting_fulfillment'] as OrderStatus[]),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("DropoffManager: Received snapshot update.");
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

            console.log("DropoffManager: Fetched orders from Firestore (in_progress or awaiting_fulfillment):", fetchedOrders);

            const relevantOrders = fetchedOrders.filter(order => {
                if (!order.processing || !order.processing.repairStatus || !order.processing.initialMethod || !order.processing.fulfillmentMethod) {
                    return false;
                }

                const { initialMethod, fulfillmentMethod, repairStatus } = order.processing;

                const isInitialDropoff = initialMethod === 'dropoff' && dropoffInitialStatuses.includes(repairStatus);

                const isCustomerPickup = fulfillmentMethod === 'pickup' && customerPickupStatuses.includes(repairStatus);

                return isInitialDropoff || isCustomerPickup;
            });

            console.log("DropoffManager: Filtered orders by relevance to this manager:", relevantOrders);

            setOrders(relevantOrders);
            setLoading(false);
        }, (error) => {
            console.error("DropoffManager: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for dropoff/pickup orders.");
            setLoading(false);
        });

        return () => {
            console.log("DropoffManager: Unsubscribing from snapshot listener.");
            unsubscribe();
        };
    }, [filterStatus]);


    const updateDropoffOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for dropoff update:", orderId);
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
            console.error("Error updating dropoff order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };


    const markItemDroppedOff = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.initialMethod !== 'dropoff' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Routed to Dropoff') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting dropoff.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Item Dropped Off" as RepairStatus,
                actualCustomerDropoffDate: Timestamp.now(),
            },
        };

        const success = await updateDropoffOrder(order.id, updates);
        if (success) {
            toast.success("Order Dropped Off", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as dropped off.`,
            });
        }
    };

    const markReadyForRepairFromDropoff = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.initialMethod !== 'dropoff' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Item Dropped Off') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be sent to repair.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Ready for Repair (from Dropoff)" as RepairStatus,
            },
        };

        const success = await updateDropoffOrder(order.id, updates);

        if (success) {
            toast.success("Order Ready for Repair", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as ready for repair.`,
            });
        }
    };

    const markPickedUpByCustomer = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.fulfillmentMethod !== 'pickup' || order.processing.status !== 'awaiting_fulfillment' || (order.processing.repairStatus !== 'Ready for Customer Pickup' && order.processing.repairStatus !== 'Scheduled for Pickup (Customer)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be marked as picked up by customer.`);
            return;
        }
        if (order.processing.repairStatus as RepairStatus === 'Picked Up by Customer') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked as picked up by customer.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "fulfilled" as OrderStatus,
                repairStatus: "Picked Up by Customer" as RepairStatus,
                actualCustomerPickupDate: Timestamp.now(),
            },
        };
        const success = await updateDropoffOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Picked Up by Customer and Fulfilled.`);
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
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    console.log("DropoffManager: Rendering Filtered Orders (after loading check):", filteredAndSearchedOrders);

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
                {/* Filter Dropdown (mobile friendly) */}
                <div className="w-full sm:w-auto">
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as DropoffFilterStatus)}
                    >
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="All Dropoff/Pickup Orders">
                                {filterStatus === 'all'
                                    ? 'All Dropoff/Pickup Orders'
                                    : filterStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status === 'all'
                                        ? 'All Dropoff/Pickup Orders'
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

                        const { initialMethod, fulfillmentMethod, repairStatus } = order.processing;

                        const isInInitialDropoffPhase = dropoffInitialStatuses.includes(repairStatus);
                        const isInCustomerPickupPhase = customerPickupStatuses.includes(repairStatus);

                        return (
                            <Card key={order.id} className="rounded-2xl shadow-md">
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-jet-black">{order.contactInfo?.name || "No Name"}</h3>
                                            <p className="text-sm text-gray-500">{order.contactInfo?.email || "No Email"}</p>
                                        </div>
                                        <Badge variant="outline" className="capitalize">
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
                                        {order.processing?.preferredDate && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-purple-500" />
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate
                                                    ? format(
                                                        typeof order.processing.preferredDate === "object" && "seconds" in order.processing.preferredDate
                                                            ? new Date((order.processing.preferredDate as Timestamp).seconds * 1000)
                                                            : new Date(order.processing.preferredDate),
                                                        "dd MMM yyyy HH:mm"
                                                    )
                                                    : "N/A"}
                                            </p>
                                        )}
                                        {isInInitialDropoffPhase && order.processing?.customerDropoffLocation && (
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Dropoff Location:</strong> {order.processing.customerDropoffLocation}
                                            </p>
                                        )}
                                        {isInCustomerPickupPhase && order.processing?.customerPickupLocation && (
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Pickup Location:</strong> {order.processing.customerPickupLocation}
                                            </p>
                                        )}
                                        {order.processing?.actualCustomerDropoffDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Actual Dropoff:</strong>{' '}
                                                {format(new Date(order.processing.actualCustomerDropoffDate.seconds * 1000), "dd MMM yyyy HH:mm")}
                                            </p>
                                        )}
                                        {order.processing?.actualCustomerPickupDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-green-500" />
                                                <strong>Actual Pickup:</strong>{' '}
                                                {format(new Date(order.processing.actualCustomerPickupDate.seconds * 1000), "dd MMM yyyy HH:mm")}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        {isInInitialDropoffPhase && (
                                            <>
                                                {repairStatus === 'Routed to Dropoff' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markItemDroppedOff(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Mark Item Dropped Off
                                                    </Button>
                                                )}
                                                {repairStatus === 'Item Dropped Off' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markReadyForRepairFromDropoff(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Mark Ready for Repair
                                                    </Button>
                                                )}
                                                {repairStatus === 'Ready for Repair (from Dropoff)' && (
                                                    <Badge variant="default" className="capitalize">Ready for Repair</Badge>
                                                )}
                                            </>
                                        )}

                                        {isInCustomerPickupPhase && (
                                            <>
                                                {repairStatus === 'Ready for Customer Pickup' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markPickedUpByCustomer(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Mark Picked Up
                                                    </Button>
                                                )}
                                                {repairStatus === 'Scheduled for Pickup (Customer)' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markPickedUpByCustomer(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Mark Picked Up
                                                    </Button>
                                                )}
                                                {repairStatus === 'Picked Up by Customer' && (
                                                    <Badge variant="default" className="capitalize">Picked Up</Badge>
                                                )}
                                            </>
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

export default DropoffManager;