// src/admin/components/OrdersTable.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { format } from "date-fns";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CircleDollarSign,
    Hash,
    Mail,
    Package,
    Phone,
    ShieldCheck,
    Truck,
    User,
    Loader2,
    ArrowRight,
    MapPin,
    CalendarDays,
    Search,
} from "lucide-react";
import OrderStepTracker from "@/components/OrderStepTracker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order, OrderStatus, PaymentStatus, RepairStatus } from "@/types/order";
import { toast } from 'sonner';

const OrdersTable: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialogId, setOpenDialogId] = useState<string | null>(null);
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    const selectedOrder = orders.find((order) => order.id === openDialogId) || null;

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const ordersRef = collection(db, "orders");
                const q = query(
                    ordersRef,
                    where('processing.status', '==', 'pending' as OrderStatus),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const orderData = snapshot.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        ...data,
                        contactInfo: data.contactInfo || {},
                        processing: data.processing || {},
                        payment: data.payment || {},
                    };
                }) as Order[];
                console.log("Fetched Pending orders in OrdersTable:", orderData);
                setOrders(orderData);
            } catch (error) {
                console.error("Error fetching pending orders:", error);
                toast.error("Error fetching pending orders", {
                    description: "Could not load pending orders from the database. Check Firebase console for index errors.",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const updateOrderField = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
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
            };

            await updateDoc(orderRef, finalUpdates);

            const isRoutingUpdate = updates.processing?.status === 'in_progress';

            setOrders((prev) =>
                isRoutingUpdate
                    ? prev.filter(o => o.id !== orderId)
                    : prev.map(o => {
                        if (o.id === orderId) {
                            const updatedOrder = { ...o, ...updates };
                            if (updates.processing) {
                                updatedOrder.processing = { ...o.processing, ...updates.processing };
                            }
                            if (updates.payment) {
                                updatedOrder.payment = { ...o.payment, ...updates.payment };
                            }
                            return updatedOrder;
                        }
                        return o;
                    })
            );

            console.log(`Order ${orderId} updated.`);

            return true;
        } catch (error) {
            setIsUpdatingOrderId(null);
            console.error("Error updating order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        }
    };

    const routeOrder = async (order: Order) => {
        if (!order || order.processing?.status !== 'pending' || order.payment?.status !== 'paid' || !order.id || !order.processing?.initialMethod) {
            toast.error("Routing Failed", {
                description: "Order is not in a routable state (must be pending, paid, and have initial method).",
            });
            return;
        }

        const initialMethod = order.processing.initialMethod;

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "in_progress" as OrderStatus,
            },
            updatedAt: serverTimestamp(),
        };

        switch (initialMethod) {
            case 'dropoff':
                updates.processing!.repairStatus = "Routed to Dropoff" as RepairStatus;
                break;
            case 'pickup':
                updates.processing!.repairStatus = "Routed for Pickup (KitFix)" as RepairStatus;
                break;
            default:
                toast.error("Routing Failed", { description: "Order is missing a valid initial method." });
                return;
        }

        const success = await updateOrderField(order.id, updates);

        if (success) {
            const methodText = initialMethod === 'dropoff' ? 'Customer Dropoff' : 'KitFix Pickup';
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} sent for ${methodText}. It has been removed from this list.`);
            setOpenDialogId(null);
        }
    };

    const getRouteButtonText = (order: Order): string => {
        if (!order.processing?.initialMethod) {
            return "Route Order (Missing Method)";
        }
        switch (order.processing.initialMethod) {
            case 'dropoff':
                return "Route to Dropoff Manager (Dropoff)";
            case 'pickup':
                return "Route to Pickup Scheduler (KitFix Pickup)";
            default:
                return "Route Order (Unknown Method)";
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    const emptyMessage = "No new pending orders found.";

    return (
        <>
            {/* Main content (Dialog, Orders, Managers, etc) */}
            <Dialog open={!!openDialogId} onOpenChange={(open) => {
                if (!open) {
                    if (!isUpdatingOrderId) {
                        setOpenDialogId(null);
                    } else {
                        console.log("Update in progress, preventing dialog close.");
                        toast.info("Please wait for the update to complete.");
                    }
                }
            }}>
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                        <div className="w-full sm:w-auto">
                            <Select value={"pending"} onValueChange={() => { }}>
                                <SelectTrigger className="w-full sm:w-[220px]">
                                    <SelectValue>Pending Orders</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending Orders</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name or ID..."
                                className="pl-9 pr-3"
                                disabled
                            />
                        </div>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-center text-gray-500">{emptyMessage}</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {orders.map((order) => (
                                <Card
                                    key={order.id}
                                    className="rounded-2xl shadow-md hover:shadow-xl transition"
                                >
                                    <CardContent className="p-6 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-jet-black">
                                                    {order.contactInfo?.name || "No Name"}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {order.contactInfo?.email || "No Email"}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`capitalize ${order.processing?.status === "completed"
                                                    ? "bg-green-100 text-green-600"
                                                    : order.processing?.status === "in_progress"
                                                        ? "bg-yellow-100 text-yellow-600"
                                                        : order.processing?.status === "cancelled"
                                                            ? "bg-red-100 text-red-600"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {order.processing?.repairStatus || "Pending Routing"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-700">
                                            <span className="flex items-center gap-1">
                                                <Hash className="h-4 w-4 text-indigo-500" />
                                                <strong>Order #:</strong> {order.id.slice(0, 6).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p className="text-gray-700">
                                                <ShieldCheck className="inline mr-1 h-4 w-4 text-lime-green" />
                                                <strong>Repair:</strong> {order.repairType || "N/A"}
                                            </p>
                                            {order.notes && (
                                                <p className="text-gray-700">
                                                    <Package className="inline mr-1 h-4 w-4 text-blue-500" />
                                                    <strong>Notes:</strong> {order.notes}
                                                </p>
                                            )}
                                            {order.processing?.initialMethod && (
                                                <p className="text-gray-700">
                                                    <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                                    <strong>Initial:</strong>{" "}
                                                    {order.processing.initialMethod.charAt(0).toUpperCase() + order.processing.initialMethod.slice(1)}
                                                </p>
                                            )}
                                            {order.processing?.fulfillmentMethod && (
                                                <p className="text-gray-700">
                                                    <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                                    <strong>Return:</strong>{" "}
                                                    {order.processing.fulfillmentMethod.charAt(0).toUpperCase() + order.processing.fulfillmentMethod.slice(1)}
                                                </p>
                                            )}
                                            {order.processing?.preferredDate && (
                                                <p className="text-gray-700">
                                                    <CalendarDays className="inline mr-1 h-4 w-4 text-purple-500" />
                                                    <strong>Preferred Date:</strong> {order.processing.preferredDate}
                                                </p>
                                            )}
                                            {order.contactInfo?.address && (
                                                <p className="text-gray-700">
                                                    <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                    <strong>Address:</strong> {order.contactInfo.address}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                                            <span className="flex items-center gap-1">
                                                <CircleDollarSign className="h-4 w-4 text-indigo-500" />
                                                {order.payment?.status === "paid" ? (
                                                    <Badge variant="default">Paid</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Unpaid</Badge>
                                                )}
                                            </span>
                                            <span className="text-xs">
                                                {order.updatedAt && typeof order.updatedAt === 'object' && 'seconds' in order.updatedAt && order.updatedAt.seconds
                                                    ? format(
                                                        new Date(order.updatedAt.seconds * 1000),
                                                        "dd MMM yyyy"
                                                    )
                                                    : "Unknown date"}
                                            </span>
                                        </div>
                                        <DialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="luxury"
                                                className="w-full mt-4"
                                                onClick={() => {
                                                    setOpenDialogId(order.id);
                                                }}
                                                disabled={!!isUpdatingOrderId}
                                            >
                                                View Order
                                            </Button>
                                        </DialogTrigger>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedOrder ? `Order Details #${selectedOrder.id.slice(0, 6).toUpperCase()}` : "Loading Order Details"}</DialogTitle>
                        <DialogDescription>
                            View and manage details for this order.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder ? (
                        <>
                            <div className="space-y-6">
                                {selectedOrder.processing ? (
                                    <OrderStepTracker order={selectedOrder} />
                                ) : (
                                    <p className="text-gray-600 text-sm">Processing info not available.</p>
                                )}
                            </div>
                            <div className="text-gray-700 space-y-1 mt-4">
                                {selectedOrder.processing?.initialMethod && (
                                    <p className="text-gray-700">
                                        <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                        <strong>Initial Method:</strong>{" "}
                                        {selectedOrder.processing.initialMethod.charAt(0).toUpperCase() + selectedOrder.processing.initialMethod.slice(1)}
                                    </p>
                                )}
                                {selectedOrder.processing?.fulfillmentMethod && (
                                    <p className="text-gray-700">
                                        <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                        <strong>Return Method:</strong>{" "}
                                        {selectedOrder.processing.fulfillmentMethod.charAt(0).toUpperCase() + selectedOrder.processing.fulfillmentMethod.slice(1)}
                                    </p>
                                )}
                                <p className="text-gray-700">
                                    <User className="inline mr-1 h-4 w-4" />
                                    <strong>Name:</strong>{" "}
                                    {selectedOrder.contactInfo?.name}
                                </p>
                                {selectedOrder.contactInfo?.phone && (
                                    <p className="text-gray-700">
                                        <Phone className="inline mr-1 h-4 w-4" />
                                        <strong>Phone:</strong>{" "}
                                        {selectedOrder.contactInfo.phone}
                                    </p>
                                )}
                                {selectedOrder.contactInfo?.email && (
                                    <p className="text-gray-700">
                                        <Mail className="inline mr-1 h-4 w-4" />
                                        <strong>Email:</strong>{" "}
                                        {selectedOrder.contactInfo.email}
                                    </p>
                                )}
                                {selectedOrder.contactInfo?.address && (
                                    <p className="text-gray-700">
                                        <strong>Contact Address:</strong>{" "}
                                        {selectedOrder.contactInfo.address}
                                    </p>
                                )}
                                {selectedOrder.processing?.preferredDate && (
                                    <p className="text-gray-700">
                                        <strong>Preferred Date:</strong> {selectedOrder.processing.preferredDate}
                                    </p>
                                )}
                                {selectedOrder.notes && (
                                    <p className="text-gray-700">
                                        <Package className="inline mr-1 h-4 w-4" />
                                        <strong>Notes:</strong>{" "}
                                        {selectedOrder.notes}
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end mt-4 gap-2">
                                {selectedOrder.processing?.status === 'pending' && selectedOrder.payment?.status === 'paid' && (
                                    <Button
                                        size="sm"
                                        variant="luxury"
                                        onClick={async () => {
                                            await routeOrder(selectedOrder);
                                        }}
                                        disabled={isUpdatingOrderId === selectedOrder.id}
                                    >
                                        {isUpdatingOrderId === selectedOrder.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowRight className="mr-2 h-4 w-4" />
                                        )}
                                        {getRouteButtonText(selectedOrder)}
                                    </Button>
                                )}
                                {selectedOrder.payment?.status === 'unpaid' && selectedOrder.processing?.status !== 'cancelled' && (
                                    <Button
                                        size="sm"
                                        variant="luxury"
                                        onClick={async () => {
                                            console.log("Marking order as paid:", selectedOrder.id);
                                            const success = await updateOrderField(selectedOrder.id, {
                                                payment: {
                                                    ...(selectedOrder.payment || {}),
                                                    status: 'paid' as PaymentStatus,
                                                    paidAt: serverTimestamp(),
                                                },
                                                updatedAt: serverTimestamp(),
                                            });
                                            if (success) {
                                                toast.success("Order marked as paid.");
                                                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, payment: { ...o.payment, status: 'paid' } } : o));
                                            }
                                        }}
                                        disabled={isUpdatingOrderId === selectedOrder.id}
                                    >
                                        {isUpdatingOrderId === selectedOrder.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Mark as Paid
                                    </Button>
                                )}
                                <DialogClose asChild>
                                    <Button size="sm" variant="luxury" disabled={!!isUpdatingOrderId}>
                                        Close
                                    </Button>
                                </DialogClose>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OrdersTable;