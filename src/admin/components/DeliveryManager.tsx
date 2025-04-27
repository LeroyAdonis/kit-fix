// src/admin/components/DeliveryManager.tsx
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
    Timestamp,
    getDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input"; // For search
import {
    Hash,
    Truck, // Method icon
    User, // Name icon
    MapPin, // Location icon (for delivery address)
    CalendarDays, // Date icon
    DollarSign, // Price icon
    CreditCard, // Payment icon
    Search, // Search icon
    Loader2, // Loading spinner
    ArrowRight, // Out for Delivery icon
    CheckCircle, // Delivered icon
    Tag, // Repair Type
    Package, // Notes
} from "lucide-react";
import { toast } from 'sonner';

// Import types
import { Order, OrderStatus, DeliveryMethod, DeliveryStatus, PaymentStatus } from "@/types/order";

// Define filter status options for Delivery Manager
const deliveryFlowStatuses: DeliveryStatus[] = [
    "awaiting_delivery", // Initial status set by customer flow or RepairManager? Let's assume RepairManager sets Ready for Delivery repairStatus and 'awaiting_delivery' deliveryStatus
    "scheduled",
    "out_for_delivery",
    "delivered",
];
type DeliveryFilterStatus = DeliveryStatus | 'all';


const DeliveryManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<DeliveryFilterStatus>('awaiting_delivery'); // Default filter
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Delivery statuses available for filtering
    const statusOptions: DeliveryFilterStatus[] = ['all', ...deliveryFlowStatuses];

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");

                // Query for orders that are 'awaiting_fulfillment' and have deliveryMethod 'delivery'
                // AND have a deliveryStatus relevant to this flow (optional filter).
                // We can filter by deliveryMethod and main status, then client-filter by deliveryStatus and repairStatus.
                let q = query(
                    ordersRef,
                    where('processing.status', '==', 'awaiting_fulfillment' as OrderStatus),
                    where('processing.deliveryMethod', '==', 'delivery' as DeliveryMethod),
                    orderBy("createdAt", "desc") // Order by creation date
                );

                const snapshot = await getDocs(q);
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

                // Client-side filter to ensure they are in the correct repair status (Ready for Delivery)
                // and have a delivery status relevant to this manager's view.
                const relevantOrders = fetchedOrders.filter(order =>
                    order.processing?.repairStatus === 'Ready for Delivery' && // Must be explicitly ready for delivery
                    order.processing?.deliveryStatus && deliveryFlowStatuses.includes(order.processing.deliveryStatus) // Must have a relevant delivery status
                );

                setOrders(relevantOrders); // Set the state with relevant orders

            } catch (error) {
                console.error("Error fetching delivery orders:", error);
                toast.error("Error fetching delivery orders", {
                    description: "Could not load orders for Delivery Manager.",
                });
            } finally {
                setLoading(false);
            }
        };

        // Fetch orders whenever the component mounts or db changes.
        fetchOrders();
    }, [db]); // Dependency array - filter/search are client-side


    // Generic update function for delivery orders
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

            // Optimistically update local state
            const updatedOrder = { ...existingOrder, ...finalUpdates };
            if (finalUpdates.processing) updatedOrder.processing = { ...existingOrder.processing, ...finalUpdates.processing };
            if (finalUpdates.payment) updatedOrder.payment = { ...existingOrder.payment, ...finalUpdates.payment };


            setOrders((prev) =>
                prev.map((o) => (o && o.id === orderId ? updatedOrder : o)) // Check for 'o' safety
            );

            return true;
        } catch (error) {
            console.error("Error updating delivery order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    // Action: Mark order as Scheduled for Delivery (Optional)
    const markAsScheduled = async (order: Order, scheduleDate: string) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.deliveryStatus !== 'awaiting_delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting scheduling.`);
            return;
        }
        if (!scheduleDate) {
            toast.warning("Please provide a schedule date.");
            return;
        }

        // Convert date string to Timestamp
        const date = new Date(scheduleDate);
        if (isNaN(date.getTime())) {
            toast.error("Invalid date selected.");
            return;
        }
        const scheduledTimestamp = Timestamp.fromDate(date);

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                deliveryStatus: "scheduled" as DeliveryStatus,
                scheduledDeliveryDate: scheduledTimestamp, // Save scheduled date as Timestamp
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Scheduled.`);
    };

    // Action: Mark order as Out for Delivery
    const markOutForDelivery = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate
        if (order.processing.deliveryStatus !== 'awaiting_delivery' && order.processing.deliveryStatus !== 'scheduled') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to go out for delivery.`);
            return;
        }
        if (order.processing.deliveryStatus === 'out_for_delivery') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already out for delivery.`);
            return;
        }


        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                deliveryStatus: "out_for_delivery" as DeliveryStatus,
                // Maybe set out for delivery timestamp? outForDeliveryAt: Timestamp.now()
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Out for Delivery.`);
    };

    // Action: Mark order as Delivered
    const markAsDelivered = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for delivery
        if (order.processing.deliveryStatus !== 'out_for_delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be out for delivery to be marked delivered.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "fulfilled" as OrderStatus, // CHANGE main status to fulfilled
                deliveryStatus: "delivered" as DeliveryStatus, // Set final delivery status
                actualDeliveryDate: Timestamp.now(), // Record actual delivery time
            },
            // Maybe clear fulfillment specific statuses/timestamps here?
            // readyForFulfillmentAt: null // Set to null to remove or clear
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Delivered and Fulfilled.`);
    };


    // --- Client-side Filtering and Searching ---
    const filteredAndSearchedOrders = orders.filter(order => {
        // Add safety check for processing and deliveryStatus
        if (!order.processing || !order.processing.deliveryStatus) return false;

        // 1. Filter by Status
        const statusMatch = filterStatus === 'all' || order.processing.deliveryStatus === filterStatus;

        if (!statusMatch) return false;

        // 2. Filter by Search Term
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

    // Updated empty state message
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
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-3">
                    {statusOptions.map(status => (
                        <Button
                            key={status}
                            variant={filterStatus === status ? 'default' : 'outline'}
                            onClick={() => setFilterStatus(status)}
                            size="sm"
                        >
                            {status === 'all' ? 'All Delivery Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Button>
                    ))}
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
                        // Add safety check inside the map loop
                        if (!order || !order.id || !order.processing) {
                            console.warn("Skipping rendering for invalid order item:", order);
                            return null;
                        }

                        const deliveryStatus = order.processing.deliveryStatus;

                        return (
                            <Card key={order.id} className="rounded-2xl shadow-md">
                                <CardContent className="p-6 space-y-3">
                                    {/* Display relevant order info */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-jet-black">{order.contactInfo?.name || "No Name"}</h3>
                                            <p className="text-sm text-gray-500">{order.contactInfo?.email || "No Email"}</p>
                                        </div>
                                        {/* Display the current deliveryStatus */}
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${deliveryStatus === "delivered"
                                                ? "bg-green-100 text-green-600"
                                                : deliveryStatus === "out_for_delivery"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : deliveryStatus === "scheduled"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : "bg-gray-100 text-gray-600" // Default for awaiting_delivery
                                                }`}
                                        >
                                            {deliveryStatus || 'Unknown Status'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-700">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-4 w-4 text-indigo-500" />
                                            <strong>Order #:</strong> {order.id.slice(0, 6).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Order details */}
                                    <div className="text-sm text-gray-700 space-y-1">
                                        <p className="text-gray-700">
                                            <Tag className="inline mr-1 h-4 w-4 text-blue-500" />
                                            <strong>Repair:</strong> {order.repairDescription || order.repairType || "N/A"}
                                        </p>
                                        <p className="text-gray-700">
                                            <Truck className="inline mr-1 h-4 w-4 text-gray-600" />
                                            <strong>Method:</strong> Delivery
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
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate}
                                            </p>
                                        )}
                                        {order.contactInfo?.address && ( // Delivery address is in contactInfo
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Address:</strong> {order.contactInfo.address}
                                            </p>
                                        )}
                                        {order.processing?.scheduledDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Scheduled:</strong> {format(new Date(order.processing.scheduledDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {order.processing?.actualDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-green-500" />
                                                <strong>Delivered:</strong> {format(new Date(order.processing.actualDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {/* Add more relevant details like price, payment status if needed in the card preview */}
                                    </div>

                                    {/* Actions based on current deliveryStatus */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Use flex-wrap */}
                                        {/* Button/Input for Scheduling (Optional Step) */}
                                        {deliveryStatus === 'awaiting_delivery' && (
                                            <>
                                                {/* Could add a date/time picker input here */}
                                                <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => { /* Handle date change */ console.log(e.target.value); }} /> {/* Placeholder Input */}
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => markAsScheduled(order, '2023-10-27')} /* Replace '2023-10-27' with actual date from input */
                                                    disabled={isUpdatingOrderId === order.id}
                                                >
                                                    {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Schedule Delivery
                                                </Button>
                                            </>
                                        )}

                                        {/* Button to mark as Out for Delivery */}
                                        {(deliveryStatus === 'awaiting_delivery' || deliveryStatus === 'scheduled') && (
                                            <Button
                                                size="sm"
                                                variant="default" // Use default for primary action
                                                onClick={() => markOutForDelivery(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <ArrowRight className="mr-1 h-4 w-4" /> Out for Delivery
                                            </Button>
                                        )}

                                        {/* Button to mark as Delivered */}
                                        {deliveryStatus === 'out_for_delivery' && (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => markAsDelivered(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Mark Delivered
                                            </Button>
                                        )}


                                        {/* Message if delivered */}
                                        {deliveryStatus === 'delivered' && (
                                            <Badge variant="default" className="capitalize">Delivered</Badge>
                                        )}

                                        {/* Maybe a View Details button similar to OrdersTable (Optional) */}
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