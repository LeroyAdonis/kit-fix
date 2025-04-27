// src/admin/components/DropoffManager.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp, // Use Timestamp type
    getDoc, // Need getDoc for updateDropoffOrder
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Hash,
    Truck,
    User,
    Clock, // Or relevant icon for awaiting dropoff
    CheckCircle, // Or relevant icon for dropped off
    MapPin, // Icon for location
    Loader2, // Loading spinner
    Package
} from "lucide-react";
import { toast } from 'sonner';

// Import the Order interface and specific statuses
import { Order, OrderStatus, DeliveryMethod, DropoffStatus, RepairStatus } from "@/types/order";

const DropoffManager: React.FC = () => {
    // Filter state for dropoff status
    const [filterStatus, setFilterStatus] = useState<DropoffStatus | 'all'>('awaiting_dropoff'); // Default to showing orders awaiting dropoff
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // State to track loading for updates, specific to an order ID
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Status options for filtering (add 'all' manually)
    const dropoffStatuses: (DropoffStatus | 'all')[] = ['all', 'awaiting_dropoff', 'dropped_off', 'ready_for_repair'];

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");
                // Query for orders that are in_progress and have deliveryMethod 'dropoff'
                const q = query(
                    ordersRef,
                    where('processing.status', '==', 'in_progress' as OrderStatus), // Must be in_progress after routing
                    where('processing.deliveryMethod', '==', 'dropoff' as DeliveryMethod),
                    // Only apply dropoffStatus filter if not 'all'
                    ...(filterStatus !== 'all' ? [where('processing.dropoffStatus', '==', filterStatus)] : []),
                    orderBy("createdAt", "desc") // Order by creation date or update date
                );

                const snapshot = await getDocs(q);
                const orderData = snapshot.docs.map((d) => {
                    const data = d.data();
                    // Ensure nested objects exist with defaults for safer typing
                    return {
                        id: d.id,
                        ...data,
                        contactInfo: data.contactInfo || {},
                        processing: data.processing || {},
                        payment: data.payment || {},
                    };
                }) as Order[];
                setOrders(orderData);
            } catch (error) {
                console.error("Error fetching dropoff orders:", error);
                toast.error("Error fetching dropoff orders", {
                    description: "Could not load orders for Dropoff Manager.",
                });
            } finally {
                setLoading(false);
            }
        };
        // Re-fetch when filterStatus changes
        fetchOrders();
        // Add filterStatus to dependency array
    }, [filterStatus, db]); // Added db to dependencies

    // Generic update function (can be reused)
    const updateDropoffOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId); // Set updating state
        try {
            const orderRef = doc(db, "orders", orderId);
            // Fetch existing to merge nested objects like processing
            // getDoc is now imported
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for dropoff update:", orderId);
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

            // Optimistically update local state
            const updatedOrder = { ...existingOrder, ...finalUpdates }; // Merge locally
            if (finalUpdates.processing) { // Ensure processing is also merged locally
                updatedOrder.processing = { ...existingOrder.processing, ...finalUpdates.processing };
            }

            setOrders((prev) =>
                prev.map((o) => (o && o.id === orderId ? updatedOrder : o)) // <-- Added check for 'o'
            );

            // No toast here, let the calling function provide specific feedback
            return true;
        } catch (error) {
            console.error("Error updating dropoff order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            // Consider reverting local state on error (complex with optimistic updates)
            return false;
        } finally {
            setIsUpdatingOrderId(null); // Reset updating state
        }
    };


    // Action: Mark order as dropped off
    const markAsDroppedOff = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }

        // Prevent marking as dropped off if it's already dropped off or beyond
        if (order.processing.dropoffStatus !== 'awaiting_dropoff') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting dropoff.`);
            return;
        }

        // Updates: Change dropoffStatus and repairStatus
        const updates: Partial<Order> = {
            processing: {
                // Start with existing processing fields
                ...order.processing,
                dropoffStatus: "dropped_off" as DropoffStatus, // Set dropped off status
                // Once dropped off, the item is now ready to enter the repair queue
                repairStatus: "Ready for Repair (from Dropoff)" as RepairStatus, // Set main repair status for Repair Manager
                actualDropoffDate: Timestamp.now(), // Record the actual dropoff time
            },
            updatedAt: serverTimestamp(), // Update timestamp
        };

        const success = await updateDropoffOrder(order.id, updates);

        if (success) {
            toast.success("Order Dropped Off", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as dropped off.`,
            });
            // The order will disappear from 'awaiting_dropoff' filter, appear under 'dropped_off' or 'all'
        }
    };

    // Action: Mark as Ready for Repair (Explicit step after dropped_off)
    const markAsReadyForRepair = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }

        // Prevent marking as ready if it's not dropped off or already ready for repair
        if (order.processing.dropoffStatus !== 'dropped_off' && order.processing.dropoffStatus !== 'ready_for_repair') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not in a state to be marked ready for repair.`);
            return;
        }
        if (order.processing.dropoffStatus === 'ready_for_repair') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked ready for repair.`);
            return;
        }


        // Updates: Change dropoffStatus and set repairStatus for Repair Manager
        const updates: Partial<Order> = {
            processing: {
                ...order.processing, // Keep existing fields
                dropoffStatus: "ready_for_repair" as DropoffStatus, // Set as ready within dropoff flow
                // repairStatus remains "Ready for Repair (from Dropoff)" set earlier
            },
            updatedAt: serverTimestamp(),
        };

        const success = await updateDropoffOrder(order.id, updates);

        if (success) {
            toast.success("Order Ready for Repair", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as ready for repair.`,
            });
            // The order will disappear from 'dropped_off' filter, appear under 'ready_for_repair' or 'all'
        }
    };


    if (loading) {
        // You can reuse the Skeleton loader from OrdersTable
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    // Add debugging log before mapping
    console.log("Rendering Dropoff Orders (after loading check):", orders);


    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 mb-6">
                {dropoffStatuses.map(status => (
                    <Button
                        key={status}
                        variant={filterStatus === status ? 'default' : 'outline'}
                        onClick={() => setFilterStatus(status)}
                        size="sm"
                    >
                        {status === 'all' ? 'All Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {/* Basic formatting */}
                    </Button>
                ))}
            </div>

            {/* Order Cards */}
            {orders.length === 0 ? (
                <p className="text-center text-gray-500">No dropoff orders found for the selected status.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.map((order) => {
                        // Add safety check inside the map loop
                        if (!order || !order.id) {
                            console.warn("Skipping rendering for invalid order item:", order);
                            return null; // Don't render if order or order.id is missing
                        }

                        return (
                            <Card key={order.id} className="rounded-2xl shadow-md">
                                <CardContent className="p-6 space-y-3">
                                    {/* Display relevant order info similar to OrdersTable */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-jet-black">{order.contactInfo?.name || "No Name"}</h3>
                                            <p className="text-sm text-gray-500">{order.contactInfo?.email || "No Email"}</p>
                                        </div>
                                        {/* Display the specific dropoff status */}
                                        <Badge variant="outline" className="capitalize">
                                            {order.processing?.dropoffStatus || 'Unknown Status'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-700">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-4 w-4 text-indigo-500" />
                                            <strong>Order #:</strong> {order.id.slice(0, 6).toUpperCase()} {/* Error line */}
                                        </span>
                                    </div>

                                    {/* Other order details like Repair Type, Notes, etc. */}
                                    <div className="text-sm text-gray-700 space-y-1">
                                        <p className="text-gray-700">
                                            <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                            <strong>Method:</strong> Dropoff
                                        </p>
                                        {/* Display Dropoff Location if available */}
                                        {order.processing?.dropoffLocation && (
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Location:</strong> {order.processing.dropoffLocation}
                                            </p>
                                        )}
                                        {order.notes && (
                                            <p className="text-gray-700">
                                                <Package className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Notes:</strong> {order.notes}
                                            </p>
                                        )}
                                        {order.processing?.preferredDate && (
                                            <p className="text-gray-700">
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate}
                                            </p>
                                        )}
                                        {order.processing?.actualDropoffDate?.seconds && (
                                            <p className="text-gray-700">
                                                <strong>Actual Dropoff:</strong>{' '}
                                                {format(new Date(order.processing.actualDropoffDate.seconds * 1000), "dd MMM yyyy HH:mm")}
                                            </p>
                                        )}
                                    </div>


                                    {/* Actions based on current dropoff status */}
                                    <div className="mt-4 flex justify-end gap-2">
                                        {/* Button to mark as Dropped Off */}
                                        {order.processing?.dropoffStatus === 'awaiting_dropoff' && (
                                            <Button
                                                size="sm"
                                                onClick={() => markAsDroppedOff(order)}
                                                disabled={isUpdatingOrderId === order.id} // Disable only the button for this order
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Mark as Dropped Off
                                            </Button>
                                        )}

                                        {/* Button to mark as Ready for Repair (Explicit step after dropped_off) */}
                                        {/* Assuming markAsDroppedOff already sets it to 'Ready for Repair (from Dropoff)' repairStatus */}
                                        {order.processing?.dropoffStatus === 'dropped_off' && (
                                            <Button
                                                size="sm"
                                                variant="secondary" // Use a different variant
                                                onClick={() => markAsReadyForRepair(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Mark Ready for Repair
                                            </Button>
                                        )}

                                        {/* Maybe a View Details button similar to OrdersTable (Optional) */}
                                        {/* You could implement a similar dialog here if needed */}
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