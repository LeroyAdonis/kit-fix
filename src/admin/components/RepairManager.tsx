// src/admin/components/RepairManager.tsx
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Hash,
    Truck,
    Clock,
    CheckCircle,
    Search,
    Loader2,
    ArrowRight,
    Tag,
    Package,
    UserCog
} from "lucide-react";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Order, OrderStatus, RepairStatus, ProcessingInfo } from "@/types/order";

const repairProcessStatuses: RepairStatus[] = [
    "Sent to Repair Manager",
    "Ready for Repair (from Dropoff)",
    "Ready for Repair (from Pickup)",
    "Assigned",
    "In Repair",
    "Repair Completed",
];

type RepairFilterStatus = RepairStatus | 'all';
const statusOptions: RepairFilterStatus[] = ['all', ...repairProcessStatuses];

const RepairManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<RepairFilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);

        const ordersRef = collection(db, "orders");

        const q = query(
            ordersRef,
            where('processing.status', '==', 'in_progress' as OrderStatus),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("RepairManager: Received snapshot update.");
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

            console.log("RepairManager: Fetched orders from Firestore (in_progress):", fetchedOrders);

            const relevantOrders = fetchedOrders.filter(order =>
                order.processing?.repairStatus && repairProcessStatuses.includes(order.processing.repairStatus)
            );

            console.log("RepairManager: Filtered orders by relevantStatuses:", relevantOrders);

            setOrders(relevantOrders);
            setLoading(false);
        }, (error) => {
            console.error("RepairManager: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for repair orders.");
            setLoading(false);
        });

        return () => {
            console.log("RepairManager: Unsubscribing from snapshot listener.");
            unsubscribe();
        };
    }, [db]);

    const updateRepairOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for update:", orderId);
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
            console.error("Error updating repair order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    const markAsAssigned = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (!(['Sent to Repair Manager', 'Ready for Repair (from Dropoff)', 'Ready for Repair (from Pickup)'] as RepairStatus[]).includes(order.processing.repairStatus)) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready for assignment.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Assigned" as RepairStatus,
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Assigned.`);
    };

    const markInRepair = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.repairStatus !== 'Assigned') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be assigned before starting repair.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "In Repair" as RepairStatus,
                repairStartTime: Timestamp.now(),
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as In Repair.`);
    };

    const markRepairCompleted = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.repairStatus !== 'In Repair') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be in repair to be marked completed.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Repair Completed" as RepairStatus,
                repairCompletionTime: Timestamp.now(),
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Repair Completed.`);
    };

    const routeToFulfillment = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.repairStatus !== 'Repair Completed') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be marked "Repair Completed" before routing to fulfillment.`);
            return;
        }

        if (!order.processing.fulfillmentMethod || (order.processing.fulfillmentMethod !== 'pickup' && order.processing.fulfillmentMethod !== 'delivery')) {
            toast.error(`Order ${order.id.slice(0, 6).toUpperCase()} has an invalid or missing fulfillment method: "${order.processing.fulfillmentMethod}". Cannot route.`);
            return;
        }

        let nextRepairStatus: RepairStatus;
        const processingUpdates: Partial<ProcessingInfo> = {
            status: 'awaiting_fulfillment' as OrderStatus,
        };

        if (order.processing.fulfillmentMethod === 'pickup') {
            nextRepairStatus = "Ready for Customer Pickup" as RepairStatus;
            processingUpdates.repairStatus = nextRepairStatus;
        } else if (order.processing.fulfillmentMethod === 'delivery') {
            nextRepairStatus = "Ready for KitFix Delivery" as RepairStatus;
            processingUpdates.repairStatus = nextRepairStatus;
        } else {
            toast.error(`Unexpected fulfillment method "${order.processing.fulfillmentMethod}". Cannot route.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                ...processingUpdates,
            },
            readyForFulfillmentAt: Timestamp.now(),
            updatedAt: serverTimestamp(),
        };

        const success = await updateRepairOrder(order.id, updates);

        if (success) {
            const fulfillmentMethodText = order.processing.fulfillmentMethod === 'pickup' ? 'Customer Pickup' : 'KitFix Delivery';
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} routed for ${fulfillmentMethodText}.`);
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
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                {/* Filter Dropdown (mobile friendly) */}
                <div className="w-full sm:w-auto">
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as RepairFilterStatus)}
                    >
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="All Repair Orders">
                                {filterStatus === 'all'
                                    ? 'All Repair Orders'
                                    : filterStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status === 'all'
                                        ? 'All Repair Orders'
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

                        const { initialMethod, fulfillmentMethod, repairStatus, status } = order.processing;

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
                                            className={`capitalize ${repairStatus === "Repair Completed"
                                                ? "bg-green-100 text-green-600"
                                                : repairStatus === "In Repair"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : repairStatus === "Assigned"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : repairStatus === "Sent to Repair Manager" || repairStatus === "Ready for Repair (from Dropoff)" || repairStatus === "Ready for Repair (from Pickup)"
                                                            ? "bg-gray-100 text-gray-600"
                                                            : repairStatus === "Ready for Customer Pickup" || repairStatus === "Ready for KitFix Delivery"
                                                                ? "bg-yellow-100 text-yellow-600"
                                                                : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {repairStatus || 'Processing'}
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
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        {status === 'in_progress' && (
                                            <>
                                                {(repairStatus === 'Sent to Repair Manager' || repairStatus === 'Ready for Repair (from Dropoff)' || repairStatus === 'Ready for Repair (from Pickup)') && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markAsAssigned(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        <UserCog className="mr-1 h-4 w-4" /> Assign
                                                    </Button>
                                                )}

                                                {repairStatus === 'Assigned' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markInRepair(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        <Clock className="mr-1 h-4 w-4" /> Start Repair
                                                    </Button>
                                                )}

                                                {repairStatus === 'In Repair' && (
                                                    <Button
                                                        size="sm"
                                                        variant="luxury"
                                                        onClick={() => markRepairCompleted(order)}
                                                        disabled={isUpdatingOrderId === order.id}
                                                    >
                                                        {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        <CheckCircle className="mr-1 h-4 w-4" /> Complete Repair
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {repairStatus === 'Repair Completed' && status === 'in_progress' && (
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                onClick={() => routeToFulfillment(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <ArrowRight className="mr-1 h-4 w-4" /> Route to Fulfillment
                                            </Button>
                                        )}

                                        {status === 'awaiting_fulfillment' && (
                                            <Badge variant="default" className="capitalize">Awaiting Fulfillment Action</Badge>
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

export default RepairManager;