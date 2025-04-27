// src/admin/components/RepairManager.tsx
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
    getDoc, // Needed for update logic
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
    ShieldCheck, // Repair icon
    Clock, // In Repair icon
    CheckCircle, // Completed icon
    MapPin, // Location icon
    Search, // Search icon
    Loader2, // Loading spinner
    ArrowRight, // Routing icon
    Tag, // Repair Type
    DollarSign, // Price
    CalendarDays, // Date
    Package, // Notes
    UserCog // Assigned icon
} from "lucide-react";
import { toast } from 'sonner';

// Import types
import { Order, OrderStatus, DeliveryMethod, DropoffStatus, PickupStatus, DeliveryStatus, RepairStatus } from "@/types/order";

// Define filter status options for Repair Manager
const repairProcessStatuses: RepairStatus[] = [
    "Sent to Repair Manager",
    "Ready for Repair (from Dropoff)",
    "Assigned",
    "In Repair",
    "Repair Completed",
];
// Added fulfillment statuses to include in 'all' view in Repair Manager if needed
const fulfillmentStatuses: RepairStatus[] = ["Ready for Pickup", "Ready for Delivery", "Out for Delivery"];

// Include fulfillment statuses in the filter options if you want to see them here
// type RepairFilterStatus = RepairStatus | 'all'; // Keep original if only showing repair process
type RepairFilterStatus = RepairStatus | 'all' | 'Ready for Pickup' | 'Ready for Delivery'; // Added Ready for Pickup/Delivery


const RepairManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<RepairFilterStatus>('Sent to Repair Manager'); // Default filter
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Repair statuses available for filtering - Updated to include fulfillment states
    const statusOptions: RepairFilterStatus[] = ['all', ...repairProcessStatuses, 'Ready for Pickup', 'Ready for Delivery'];


    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");

                // Query for orders that are 'in_progress' or 'awaiting_fulfillment'
                // Firestore workaround: Fetch all 'in_progress' + 'awaiting_fulfillment' and filter client-side
                // If the total number of orders in these states is too large, this approach needs rethinking.
                let q = query(
                    ordersRef,
                    where('processing.status', 'in', ['in_progress', 'awaiting_fulfillment'] as OrderStatus[]), // Fetch orders in both states
                    orderBy("createdAt", "desc")
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

                // Client-side filtering for statuses relevant to Repair OR Fulfillment Manager VIEWS
                // This manager VIEW should show orders that are *in* the repair process OR *ready for* fulfillment
                const relevantRepairAndFulfillmentStatuses = [...repairProcessStatuses, ...fulfillmentStatuses]; // Combine relevant statuses
                const relevantOrders = fetchedOrders.filter(order =>
                    order.processing?.repairStatus && relevantRepairAndFulfillmentStatuses.includes(order.processing.repairStatus)
                );


                setOrders(relevantOrders); // Set the state with relevant orders

            } catch (error) {
                console.error("Error fetching repair orders:", error);
                toast.error("Error fetching repair orders", {
                    description: "Could not load orders for Repair Manager.",
                });
            } finally {
                setLoading(false);
            }
        };

        // Fetch orders whenever the component mounts or db changes.
        // Note: Filtering/searching is now client-side, so no refetch needed for filter/search term changes.
        fetchOrders();
    }, [db]); // Dependency array


    // Generic update function for repair orders
    const updateRepairOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId); // Set updating state
        try {
            const orderRef = doc(db, "orders", orderId);
            // Fetch existing to merge nested objects like processing
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for repair update:", orderId);
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
                updatedAt: serverTimestamp(), // Always update timestamp on any change
            };

            await updateDoc(orderRef, finalUpdates);

            // Optimistically update local state
            const updatedOrder = { ...existingOrder, ...finalUpdates }; // Merge locally
            if (finalUpdates.processing) { // Ensure processing is also merged locally
                updatedOrder.processing = { ...existingOrder.processing, ...finalUpdates.processing };
            }
            // Also merge other top-level updates like payment
            if (finalUpdates.payment) {
                updatedOrder.payment = { ...existingOrder.payment, ...finalUpdates.payment };
            }


            setOrders((prev) =>
                prev.map((o) => (o && o.id === orderId ? updatedOrder : o)) // Check for 'o' safety
            );

            // No toast here, let the calling function provide specific feedback
            return true;
        } catch (error) {
            console.error("Error updating repair order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            // Consider reverting local state on error (complex with optimistic updates)
            return false;
        } finally {
            setIsUpdatingOrderId(null); // Reset updating state
        }
    };

    // Action: Mark order as Assigned
    const markAsAssigned = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for assigning
        if (order.processing.repairStatus !== 'Sent to Repair Manager' && order.processing.repairStatus !== 'Ready for Repair (from Dropoff)') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready for assignment.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Assigned" as RepairStatus,
                repairManagerStatus: "Assigned", // Internal status if needed
                // Maybe set assigned technician ID here? assignedTo: 'tech1'
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Assigned.`);
    };

    // Action: Mark order as In Repair
    const markInRepair = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for starting repair
        if (order.processing.repairStatus !== 'Assigned') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be assigned before starting repair.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "In Repair" as RepairStatus,
                // Maybe set repair start timestamp? repairStartTime: Timestamp.now()
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as In Repair.`);
    };

    // Action: Mark Repair Completed
    const markRepairCompleted = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for completing repair
        if (order.processing.repairStatus !== 'In Repair') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be in repair to be marked completed.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Repair Completed" as RepairStatus,
                // Maybe set repair completion timestamp? repairCompletionTime: Timestamp.now()
            },
        };
        const success = await updateRepairOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Repair Completed.`);
    };


    // Action: Route to Fulfillment Manager (Pickup or Delivery)
    const routeToFulfillment = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for routing to fulfillment
        if (order.processing.repairStatus !== 'Repair Completed') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be marked "Repair Completed" before routing to fulfillment.`);
            return;
        }

        // --- Corrected Routing Logic ---
        // Ensure delivery method is set and valid for routing
        if (!order.processing.deliveryMethod || (order.processing.deliveryMethod !== 'pickup' && order.processing.deliveryMethod !== 'dropoff' && order.processing.deliveryMethod !== 'delivery')) {
            toast.error(`Order ${order.id.slice(0, 6).toUpperCase()} has an invalid or missing delivery method for fulfillment: "${order.processing.deliveryMethod}".`);
            return;
        }


        let nextRepairStatus: RepairStatus;
        let destinationManager: string;
        let processingUpdates: Partial<ProcessingInfo> = { // Start with existing processing fields
            ...order.processing,
            status: 'awaiting_fulfillment' as OrderStatus, // <-- CHANGE main status
        };

        if (order.processing.deliveryMethod === 'pickup' || order.processing.deliveryMethod === 'dropoff') {
            // Both pickup and dropoff result in customer pickup after repair
            nextRepairStatus = "Ready for Pickup" as RepairStatus;
            destinationManager = "Pickup Scheduler";
            processingUpdates.repairStatus = nextRepairStatus;
            // Set/ensure pickup-specific status for Pickup Scheduler
            processingUpdates.pickupStatus = "awaiting_pickup" as PickupStatus;
            // Ensure other method statuses are cleared or set to null
            processingUpdates.dropoffStatus = null; // Explicitly clear dropoff status
            processingUpdates.deliveryStatus = null; // Explicitly clear delivery status

        } else if (order.processing.deliveryMethod === 'delivery') {
            // Delivery method
            nextRepairStatus = "Ready for Delivery" as RepairStatus;
            destinationManager = "Delivery Manager";
            processingUpdates.repairStatus = nextRepairStatus;
            // Set/ensure delivery-specific status for Delivery Manager
            processingUpdates.deliveryStatus = "awaiting_delivery" as DeliveryStatus;
            // Ensure other method statuses are cleared or set to null
            processingUpdates.pickupStatus = null; // Explicitly clear pickup status
            processingUpdates.dropoffStatus = null; // Explicitly clear dropoff status

        } else {
            // Fallback - this should ideally not be reached with the check above
            toast.error(`Unexpected delivery method "${order.processing.deliveryMethod}". Cannot route.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: processingUpdates, // Use the constructed processing updates
            readyForFulfillmentAt: Timestamp.now(), // Optional timestamp
            updatedAt: serverTimestamp(),
        };

        const success = await updateRepairOrder(order.id, updates);
        if (success) {
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} routed to ${destinationManager}.`);
        }
    };


    // --- Client-side Filtering and Searching ---
    const filteredAndSearchedOrders = orders.filter(order => {
        // Add safety check for processing and repairStatus
        if (!order.processing || !order.processing.repairStatus) return false;

        // 1. Filter by Status (using repairStatus)
        const statusMatch = filterStatus === 'all' || order.processing.repairStatus === filterStatus;

        if (!statusMatch) return false;

        // 2. Filter by Search Term (on customer name or ID)
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

    // Updated empty state message based on filter and search
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
                            {status === 'all' ? 'All Repair Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

                        const deliveryMethod = order.processing?.deliveryMethod; // Get method for display

                        return (
                            <Card key={order.id} className="rounded-2xl shadow-md">
                                <CardContent className="p-6 space-y-3">
                                    {/* Display relevant order info */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-jet-black">{order.contactInfo?.name || "No Name"}</h3>
                                            <p className="text-sm text-gray-500">{order.contactInfo?.email || "No Email"}</p>
                                        </div>
                                        {/* Display the current repairStatus */}
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${order.processing?.repairStatus === "Repair Completed" || order.processing?.repairStatus === "Ready for Pickup" || order.processing?.repairStatus === "Ready for Delivery"
                                                ? "bg-green-100 text-green-600" // Use green for completed/ready for fulfillment
                                                : order.processing?.repairStatus === "In Repair"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : order.processing?.repairStatus === "Assigned"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : "bg-gray-100 text-gray-600" // Default for initial repair states
                                                }`}
                                        >
                                            {order.processing?.repairStatus || 'Processing'}
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
                                            <strong>Method:</strong> {deliveryMethod ? deliveryMethod.charAt(0).toUpperCase() + deliveryMethod.slice(1) : 'N/A'}
                                        </p>
                                        {order.notes && (
                                            <p className="text-gray-700">
                                                <Package className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Notes:</strong> {order.notes}
                                            </p>
                                        )}
                                        {/* Add more relevant details like price, dates etc if needed in the card preview */}
                                    </div>

                                    {/* Actions based on current repairStatus */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Use flex-wrap for smaller screens */}
                                        {/* Button to mark as Assigned */}
                                        {(order.processing?.repairStatus === 'Sent to Repair Manager' || order.processing?.repairStatus === 'Ready for Repair (from Dropoff)') && (
                                            <Button
                                                size="sm"
                                                onClick={() => markAsAssigned(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <UserCog className="mr-1 h-4 w-4" /> Assign
                                            </Button>
                                        )}

                                        {/* Button to mark as In Repair */}
                                        {order.processing?.repairStatus === 'Assigned' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => markInRepair(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <Clock className="mr-1 h-4 w-4" /> Start Repair
                                            </Button>
                                        )}

                                        {/* Button to mark Repair Completed */}
                                        {order.processing?.repairStatus === 'In Repair' && (
                                            <Button
                                                size="sm"
                                                variant="default" // Use default variant for primary action
                                                onClick={() => markRepairCompleted(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Complete Repair
                                            </Button>
                                        )}

                                        {/* Button to Route to Fulfillment */}
                                        {order.processing?.repairStatus === 'Repair Completed' && (
                                            <Button
                                                size="sm"
                                                variant="default" // Use default variant
                                                onClick={() => routeToFulfillment(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <ArrowRight className="mr-1 h-4 w-4" /> Route to Fulfillment
                                            </Button>
                                        )}

                                        {/* Maybe a View Details button similar to OrdersTable (Optional) */}
                                        {/* This would involve implementing a similar dialog here */}
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