/* eslint-disable @typescript-eslint/no-unused-vars */
// src/admin/components/PickupScheduler.tsx
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
    CheckCircle,
    Tag,
    Package,
    ArrowRight,
} from "lucide-react";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Order, OrderStatus, InitialMethod, RepairStatus } from "@/types/order";

const kitFixPickupStatuses: RepairStatus[] = [
    "Routed for Pickup (KitFix)",
    "Scheduled for Pickup (KitFix)",
    "Item Picked Up (KitFix)" as RepairStatus,
    "Ready for Repair (from Pickup)" as RepairStatus,
];
const relevantStatuses: RepairStatus[] = [...kitFixPickupStatuses];
type PickupFilterStatus = RepairStatus | 'all';

const PickupScheduler: React.FC = () => {
    const [filterStatus, setFilterStatus] = useState<PickupFilterStatus>('all');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    const statusOptions: PickupFilterStatus[] = ['all', ...relevantStatuses];

    useEffect(() => {
        setLoading(true);

        const ordersRef = collection(db, "orders");

        const q = query(
            ordersRef,
            where('processing.status', '==', 'in_progress' as OrderStatus),
            where('processing.initialMethod', '==', 'pickup' as InitialMethod),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
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

            const relevantOrders = fetchedOrders.filter(order =>
                order.processing?.repairStatus && relevantStatuses.includes(order.processing.repairStatus)
            );

            setOrders(relevantOrders);
            setLoading(false);
        }, (error) => {
            console.error("PickupScheduler: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for KitFix pickup orders.");
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [filterStatus]);

    const updatePickupOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
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

            return true;
        } catch (error) {
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    const markScheduledForKitFixPickup = async (order: Order, scheduleDate: string) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.initialMethod !== 'pickup' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Routed for Pickup (KitFix)') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting scheduling for KitFix pickup.`);
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
                repairStatus: "Scheduled for Pickup (KitFix)" as RepairStatus,
                scheduledInitialPickupDate: scheduledTimestamp,
            },
        };
        const success = await updatePickupOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} scheduled for KitFix pickup.`);
    };

    const markPickedUpByKitFix = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.initialMethod !== 'pickup' || order.processing.status !== 'in_progress' || (order.processing.repairStatus !== 'Routed for Pickup (KitFix)' && order.processing.repairStatus !== 'Scheduled for Pickup (KitFix)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be marked as picked up by KitFix.`);
            return;
        }
        if (order.processing.repairStatus === 'Item Picked Up (KitFix)' as RepairStatus) {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked as picked up by KitFix.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Item Picked Up (KitFix)" as RepairStatus,
                actualInitialPickupDate: Timestamp.now(),
            },
        };
        const success = await updatePickupOrder(order.id, updates);
        if (success) {
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Picked Up by KitFix.`);
        }
    };

    const markReadyForRepairFromPickup = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.initialMethod !== 'pickup' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Item Picked Up (KitFix)') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not marked as picked up by KitFix.`);
            return;
        }
        if (order.processing.repairStatus === "Ready for Repair (from Pickup)" as RepairStatus) {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked ready for repair.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Ready for Repair (from Pickup)" as RepairStatus,
            },
        };

        const success = await updatePickupOrder(order.id, updates);
        if (success) {
            toast.success("Order Ready for Repair", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} sent to Repair Queue.`,
            });
        }
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

    let emptyMessage = "No orders found.";
    if (filterStatus !== 'all') {
        emptyMessage = `No "${filterStatus.replace(/_/g, ' ')}" orders found.`;
    }
    if (searchTerm) {
        emptyMessage = `No orders found matching "${searchTerm}"` + (filterStatus !== 'all' ? ` with status "${filterStatus.replace(/_/g, ' ')}".` : '.');
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-6">
                <div className="w-full sm:w-auto">
                    <Select value={filterStatus} onValueChange={v => setFilterStatus(v as PickupFilterStatus)}>
                        <SelectTrigger className="w-full min-w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {status === 'all' ? 'All Statuses' : status.replace(/_/g, ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Search by name or order #"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3"
                        />
                    </div>
                </div>
            </div>
            {filteredAndSearchedOrders.length === 0 ? (
                <p className="text-center text-gray-500">{emptyMessage}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAndSearchedOrders.map((order) => {
                        if (!order || !order.id || !order.processing) {
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
                                        {order.contactInfo?.address && initialMethod === 'pickup' && (
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Pickup Address:</strong> {order.contactInfo.address}
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
                                        {order.processing?.scheduledInitialPickupDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Scheduled:</strong> {format(new Date(order.processing.scheduledInitialPickupDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {order.processing?.actualInitialPickupDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-green-500" />
                                                <strong>Picked Up:</strong> {format(new Date(order.processing.actualInitialPickupDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        {repairStatus === 'Routed for Pickup (KitFix)' && (
                                            <>
                                                <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => { console.log(e.target.value); }} />
                                                <Button
                                                    size="sm"
                                                    variant="luxury"
                                                    onClick={() => markScheduledForKitFixPickup(order, '2023-10-27')}
                                                    disabled={isUpdatingOrderId === order.id}
                                                >
                                                    {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Schedule Pickup
                                                </Button>
                                            </>
                                        )}

                                        {(repairStatus === "Routed for Pickup (KitFix)" || repairStatus === "Scheduled for Pickup (KitFix)" as RepairStatus) && (
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                onClick={() => markPickedUpByKitFix(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Mark Picked Up
                                            </Button>
                                        )}

                                        {repairStatus === 'Item Picked Up (KitFix)' && (
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                onClick={() => markReadyForRepairFromPickup(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <ArrowRight className="mr-1 h-4 w-4" /> Send to Repair
                                            </Button>
                                        )}

                                        {repairStatus === 'Ready for Repair (from Pickup)' && (
                                            <Badge variant="default" className="capitalize">Ready for Repair</Badge>
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

export default PickupScheduler;