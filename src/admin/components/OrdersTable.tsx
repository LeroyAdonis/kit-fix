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
    getDoc, // <-- Ensure getDoc is imported
    Timestamp,
    serverTimestamp,
    // <-- Ensure DialogDescription is imported
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
} from "lucide-react";
import OrderStepTracker from "@/components/OrderStepTracker";

// Import the updated Order interfaces
import { Order, OrderStatus, PaymentStatus, RepairStatus, DeliveryMethod, DropoffStatus, PickupStatus, DeliveryStatus } from "@/types/order";

// Import sonner toast
import { toast } from 'sonner';


// Define possible filter statuses (removed this as we only show pending now)
// type OrdersFilterStatus = OrderStatus | 'all';

const OrdersTable: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // State to track which order's dialog is open
    const [openDialogId, setOpenDialogId] = useState<string | null>(null);
    // State to track loading for updates, specific to the selected order
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Filter state is removed as we only show pending

    // Filter options are removed

    // Find the selected order based on openDialogId
    const selectedOrder = orders.find((order) => order.id === openDialogId) || null;

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const ordersRef = collection(db, "orders");
                // Query to fetch ONLY PENDING orders
                const q = query(
                    ordersRef,
                    where('processing.status', '==', 'pending' as OrderStatus), // <-- Filter by pending
                    orderBy("createdAt", "desc") // Order by creation date
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
                console.log("Fetched Pending orders in OrdersTable:", orderData); // Log fetched orders
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
        // Fetch orders initially on mount
        fetchOrders();
        // Add db to dependency array if it could change, though unlikely
    }, [db]); // Empty dependency array to fetch pending orders once on mount

    // Generic update function
    const updateOrderField = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            // Use updateDoc, it merges top-level fields.
            // For nested objects like 'processing', fetch existing and merge locally first
            // getDoc is now imported correctly
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for update:", orderId);
                toast.error("Update Failed", { description: "Order not found." });
                return false;
            }

            // Deep merge processing object if updates.processing exists
            const updatedProcessing = updates.processing
                ? { ...existingOrder.processing, ...updates.processing }
                : existingOrder.processing; // Keep existing if no processing updates

            // Create final update object
            const finalUpdates: Partial<Order> = {
                ...updates, // Apply other updates
                processing: updatedProcessing, // Use the merged processing
            };


            await updateDoc(orderRef, finalUpdates);


            // Update local state to reflect changes immediately IF the order should remain in the list
            // Orders being routed ('pending' -> 'in_progress') should be removed from the list
            // For "Mark as Paid" on a pending order, we should update the status locally instead of removing.
            // This logic needs to correctly identify if the update means the item should be removed or just modified locally.

            const isRoutingUpdate = updates.processing?.status === 'in_progress'; // Simple check: if status becomes in_progress, it's a routing update

            setOrders((prev) =>
                isRoutingUpdate
                    ? prev.filter(o => o.id !== orderId) // Remove the order if it was just routed from pending
                    : prev.map(o => { // Otherwise, update it in place (e.g. Mark as Paid)
                        if (o.id === orderId) {
                            // Apply all the updates locally
                            const updatedOrder = { ...o, ...updates };
                            // Need to ensure processing is also merged if updates.processing exists
                            if (updates.processing) {
                                updatedOrder.processing = { ...o.processing, ...updates.processing };
                            }
                            // Also update payment status if it was part of updates
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
            setIsUpdatingOrderId(null); // Ensure loading state is turned off here on error
            console.error("Error updating order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            // Consider re-fetching or reverting local state on error if optimistic update is used
            // Given this table only shows pending, on error, the item likely stays until refresh anyway.
            return false;
        } finally {
            // Loading state is turned off inside try/catch blocks now
            // setIsUpdatingOrderId(null); // Removed from finally
        }
    };


    // Renamed function to routeOrder
    const routeOrder = async (order: Order) => {
        // This function is called from the Dialog for a 'pending' order
        if (!order || order.processing?.status !== 'pending' || order.payment?.status !== 'paid' || !order.id) { // Ensure payment status is paid
            toast.error("Routing Failed", {
                description: "Order is not in a routable state (must be pending and paid).",
            });
            return;
        }

        const deliveryMethod = order.processing.deliveryMethod;

        // Prepare updates for routing
        let updates: Partial<Order> = {
            processing: {
                // Start with existing processing fields from the order object
                ...order.processing,
                status: "in_progress" as OrderStatus, // Change main status to in_progress
                // repairStatus and method-specific statuses are set below
            },
            updatedAt: serverTimestamp(), // Use serverTimestamp()
        };

        let destinationManager: string;

        switch (deliveryMethod) {
            case 'dropoff':
                destinationManager = 'Dropoff Manager';
                updates.processing!.repairStatus = "Routed to Dropoff" as RepairStatus;
                updates.processing!.dropoffStatus = "awaiting_dropoff" as DropoffStatus; // Ensure status is correct
                break;
            case 'pickup':
                destinationManager = 'Repair Manager (Pickup)';
                updates.processing!.repairStatus = "Sent to Repair Manager" as RepairStatus;
                updates.processing!.repairManagerStatus = "Assigned";
                updates.processing!.pickupStatus = "awaiting_pickup" as PickupStatus; // Ensure status is correct
                break;
            case 'delivery':
                destinationManager = 'Repair Manager (Delivery)';
                updates.processing!.repairStatus = "Sent to Repair Manager" as RepairStatus;
                updates.processing!.repairManagerStatus = "Assigned";
                updates.processing!.deliveryStatus = "awaiting_delivery" as DeliveryStatus; // Ensure status is correct
                break;
            default:
                // Fallback for unspecified method - route to Repair Manager
                destinationManager = 'Repair Manager (Unspecified)';
                updates.processing!.repairStatus = "Sent to Repair Manager" as RepairStatus;
                updates.processing!.repairManagerStatus = "Assigned";
                console.warn(`Order ${order.id} has no specified delivery method. Routing to Repair Manager.`);
                // You might want to prevent routing if deliveryMethod is missing/invalid
                toast.error("Routing Failed", { description: "Order is missing delivery method." });
                return; // Stop routing if method is invalid
        }

        const success = await updateOrderField(order.id, updates); // updateOrderField now removes from local state on success

        if (success) {
            toast.success("Order Routed", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} sent to ${destinationManager}. It has been removed from this list.`, // Updated toast
            });
            // Close the dialog after successful routing
            setOpenDialogId(null); // Close the dialog by setting the ID to null
        } // Error toast is handled in updateOrderField
    };

    // Helper to determine button text for routing
    const getRouteButtonText = (order: Order): string => { // Expect Order, not Order | null here
        if (!order.processing?.deliveryMethod) { // Use optional chaining
            return "Route Order"; // Fallback text
        }
        switch (order.processing.deliveryMethod) {
            case 'dropoff':
                return "Route to Dropoff Manager";
            case 'pickup':
                return "Route to Repair Manager (Pickup)";
            case 'delivery':
                return "Route to Repair Manager (Delivery)";
            default:
                return "Route Order"; // Fallback
        }
    };

    // No client-side filtering needed as query already filters

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    // Updated empty state message for pending orders
    const emptyMessage = "No new pending orders found.";


    return (
        // Wrap the main content within the Dialog
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
            {/* Main content container (Filters + Grid/Empty message) */}
            <div className="space-y-6">
                {/* Filter Buttons - Removed */}
                {/* Display pending orders */}
                {orders.length === 0 ? ( // Use 'orders' directly as it's already filtered
                    <p className="text-center text-gray-500">{emptyMessage}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {orders.map((order) => ( // Map over 'orders' state
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
                                        {order.processing?.deliveryMethod && (
                                            <p className="text-gray-700">
                                                <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                                <strong>Method:</strong>{" "}
                                                {order.processing.deliveryMethod.charAt(0).toUpperCase() + order.processing.deliveryMethod.slice(1)}
                                            </p>
                                        )}
                                        {order.contactInfo?.address && order.processing?.deliveryMethod === 'delivery' && (
                                            <p className="text-gray-700">
                                                <strong>Delivery Address:</strong> {order.contactInfo.address}
                                            </p>
                                        )}
                                        {selectedOrder?.processing?.preferredDate && ( // Use selectedOrder here
                                            <p className="text-gray-700">
                                                <strong>Preferred Date:</strong> {selectedOrder.processing.preferredDate}
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
                                    {/* Dialog Trigger for EACH order card - This is NOW inside the Dialog parent */}
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
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

            {/* --- Dialog Content defined ONCE as a sibling to the main content container --- */}
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    {/* Dynamic title based on selectedOrder */}
                    <DialogTitle>{selectedOrder ? `Order Details #${selectedOrder.id.slice(0, 6).toUpperCase()}` : "Loading Order Details"}</DialogTitle>
                    {/* Add DialogDescription here */}
                    <DialogDescription>
                        View and manage details for this order.
                    </DialogDescription>
                </DialogHeader>

                {/* Content inside DialogContent is conditional */}
                {selectedOrder ? (
                    <> {/* Use a Fragment for the content block */}
                        <div className="space-y-6">
                            {/* OrderStepTracker */}
                            {selectedOrder.processing ? (
                                <OrderStepTracker order={selectedOrder} />
                            ) : (
                                <p className="text-gray-600 text-sm">Processing info not available.</p>
                            )}
                        </div>
                        <div className="text-gray-700 space-y-1 mt-4">
                            {/* Display method in details */}
                            {selectedOrder.processing?.deliveryMethod && (
                                <p className="text-gray-700">
                                    <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                    <strong>Method:</strong>{" "}
                                    {selectedOrder.processing.deliveryMethod.charAt(0).toUpperCase() + selectedOrder.processing.deliveryMethod.slice(1)}
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
                            {/* Photos */}
                        </div>

                        <div className="flex justify-end mt-4 gap-2">
                            {selectedOrder.processing?.status === 'pending' && selectedOrder.payment?.status === 'paid' && (
                                <Button
                                    size="sm"
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
                                    variant="default"
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
                                <Button size="sm" variant="outline" disabled={!!isUpdatingOrderId}>
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

    );
};

export default OrdersTable;