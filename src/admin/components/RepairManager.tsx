// src/admin/components/RepairManager.tsx
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs, // Might not need getDocs anymore if using onSnapshot
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    getDoc, // Needed for update logic
    // Import onSnapshot
    onSnapshot,
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
import { Order, OrderStatus, InitialMethod, FulfillmentMethod, RepairStatus, PaymentStatus, ProcessingInfo } from "@/types/order"; // Ensure ProcessingInfo is imported for updates

// Define filter status options for Repair Manager
// These are the statuses an order is *in* while being managed by the Repair Manager
const repairProcessStatuses: RepairStatus[] = [
    "Sent to Repair Manager",           // Arriving from OrdersTable (pickup/delivery)
    "Ready for Repair (from Dropoff)",  // Arriving from DropoffManager
    "Ready for Repair (from Pickup)",   // Arriving from PickupScheduler
    "Assigned",
    "In Repair",
    "Repair Completed",                 // Final status in THIS manager's view
];

// Statuses available for filtering in the UI of THIS manager
type RepairFilterStatus = RepairStatus | 'all';
const statusOptions: RepairFilterStatus[] = ['all', ...repairProcessStatuses]; // Filter only by statuses relevant to the repair process


const RepairManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<RepairFilterStatus>('all'); // Default filter to 'all' or an initial state
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);


    useEffect(() => {
        setLoading(true); // Start loading when the effect runs

        const ordersRef = collection(db, "orders");

        // Query to fetch orders that are IN_PROGRESS
        // Orders routed from OrdersTable (pickup/delivery) or DropoffManager (after dropoff/ready for repair) are in_progress.
        // Orders routed *to* fulfillment are awaiting_fulfillment.
        // So, fetch orders in_progress.
        const q = query(
            ordersRef,
            where('processing.status', '==', 'in_progress' as OrderStatus), // Fetch orders in_progress
            orderBy("createdAt", "desc")
        );

        // Use onSnapshot for real-time updates
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

            // DEBUG: Log fetched orders from Firestore
            console.log("RepairManager: Fetched orders from Firestore (in_progress):", fetchedOrders);

            // Client-side filter to include only orders whose repairStatus is in repairProcessStatuses
            // This ensures only orders that are actively in the repair manager's workflow are displayed.
            const relevantOrders = fetchedOrders.filter(order =>
                order.processing?.repairStatus && repairProcessStatuses.includes(order.processing.repairStatus)
            );

            // DEBUG: Log orders after filtering by relevantStatuses
            console.log("RepairManager: Filtered orders by relevantStatuses:", relevantOrders);

            setOrders(relevantOrders); // Set the state with relevant orders
            setLoading(false); // Set loading to false AFTER receiving the first snapshot
        }, (error) => {
            console.error("RepairManager: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for repair orders.");
            setLoading(false); // Ensure loading is off on error
        });

        // Cleanup function: Unsubscribe when the component unmounts or the effect re-runs
        return () => {
            console.log("RepairManager: Unsubscribing from snapshot listener.");
            unsubscribe();
        };

        // Dependencies: Add dependencies that could change the query.
        // The query depends on db. filterStatus and searchTerm affect client-side filtering,
        // but they don't need to trigger a re-fetch from Firestore in this setup.
    }, [db]); // Depend only on db


    // Generic update function - Rely solely on onSnapshot for local state update
    const updateRepairOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId); // Set updating state
        try {
            const orderRef = doc(db, "orders", orderId);
            // Fetch existing is still useful for merging nested objects accurately before sending to Firestore
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
                ...updates, // Apply other updates
                processing: updatedProcessing, // Use the merged processing
                updatedAt: serverTimestamp(), // Always update timestamp on any change
            };

            await updateDoc(orderRef, finalUpdates);

            // Rely on onSnapshot to update the 'orders' state.
            // The updated order will automatically appear/disappear based on the query and client-side filter.

            console.log(`Order ${orderId} Firestore updated.`);

            return true;
        } catch (error) {
            console.error("Error updating repair order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
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
        // Check if status is appropriate for assigning (incoming statuses to repair)
        if (order.processing.repairStatus !== 'Sent to Repair Manager' && order.processing.repairStatus !== 'Ready for Repair (from Dropoff)' && order.processing.repairStatus !== 'Ready for Repair (from Pickup)') { // Include all incoming repair statuses
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready for assignment.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Assigned" as RepairStatus,
                // repairManagerStatus: "Assigned", // Internal status if needed
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
                repairStartTime: Timestamp.now(), // Set repair start timestamp
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
                repairCompletionTime: Timestamp.now(), // Set repair completion timestamp
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
        // Determine routing based on fulfillmentMethod
        if (!order.processing.fulfillmentMethod || (order.processing.fulfillmentMethod !== 'pickup' && order.processing.fulfillmentMethod !== 'delivery')) {
            toast.error(`Order ${order.id.slice(0, 6).toUpperCase()} has an invalid or missing fulfillment method: "${order.processing.fulfillmentMethod}". Cannot route.`);
            return;
        }


        let nextRepairStatus: RepairStatus;
        let destinationManager: string;
        // No need to copy existing processing state here, updateRepairOrder fetches it
        let processingUpdates: Partial<ProcessingInfo> = {
            status: 'awaiting_fulfillment' as OrderStatus, // <-- CHANGE main status
            // repairStatus will be set below
        };

        if (order.processing.fulfillmentMethod === 'pickup') { // <-- CHECK FULFILLMENT METHOD
            nextRepairStatus = "Ready for Customer Pickup" as RepairStatus;
            destinationManager = "Dropoff Manager (Customer Pickup)";
            processingUpdates.repairStatus = nextRepairStatus;
            // No need to set pickupStatus here, DropoffManager manages its specific statuses
            // processingUpdates.pickupStatus = "awaiting_pickup" as PickupStatus; // REMOVE

        } else if (order.processing.fulfillmentMethod === 'delivery') { // Check fulfillment method
            nextRepairStatus = "Ready for KitFix Delivery" as RepairStatus;
            destinationManager = "Delivery Manager";
            processingUpdates.repairStatus = nextRepairStatus;
            // No need to set deliveryStatus here, DeliveryManager manages its specific statuses
            // processingUpdates.deliveryStatus = "awaiting_delivery" as DeliveryStatus; // REMOVE

        } else {
            // Fallback - this should ideally not be reached with the check above
            toast.error(`Unexpected fulfillment method "${order.processing.fulfillmentMethod}". Cannot route.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: processingUpdates, // Use the constructed processing updates
            readyForFulfillmentAt: Timestamp.now(), // Timestamp when ready for fulfillment
            updatedAt: serverTimestamp(),
        };

        const success = await updateRepairOrder(order.id, updates); // updateRepairOrder performs Firestore write

        if (success) {
            // The order will disappear from this list automatically due to onSnapshot
            const fulfillmentMethodText = order.processing.fulfillmentMethod === 'pickup' ? 'Customer Pickup' : 'KitFix Delivery';
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} routed for ${fulfillmentMethodText}.`);
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
                    {statusOptions.map(status => ( // Uses updated statusOptions
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

                        const { initialMethod, fulfillmentMethod, repairStatus, status } = order.processing; // Destructure needed fields


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
                                            className={`capitalize ${repairStatus === "Repair Completed"
                                                ? "bg-green-100 text-green-600"
                                                : repairStatus === "In Repair"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : repairStatus === "Assigned"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : repairStatus === "Sent to Repair Manager" || repairStatus === "Ready for Repair (from Dropoff)" || repairStatus === "Ready for Repair (from Pickup)"
                                                            ? "bg-gray-100 text-gray-600" // Incoming statuses
                                                            : repairStatus === "Ready for Customer Pickup" || repairStatus === "Ready for KitFix Delivery"
                                                                ? "bg-yellow-100 text-yellow-600" // Awaiting fulfillment routing
                                                                : "bg-gray-100 text-gray-600" // Default/other statuses
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

                                    {/* Order details */}
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
                                        {/* Add more relevant details like price, dates etc if needed in the card preview */}
                                    </div>

                                    {/* --- Actions --- */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Use flex-wrap for smaller screens */}

                                        {/* Actions for orders IN the repair process (status === 'in_progress') */}
                                        {status === 'in_progress' && (
                                            <>
                                                {/* Button to mark as Assigned */}
                                                {(repairStatus === 'Sent to Repair Manager' || repairStatus === 'Ready for Repair (from Dropoff)' || repairStatus === 'Ready for Repair (from Pickup)') && ( // Include all incoming repair statuses
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
                                                {repairStatus === 'Assigned' && (
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
                                                {repairStatus === 'In Repair' && (
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
                                            </>
                                        )}

                                        {/* Button to Route to Fulfillment (appears when repairStatus === 'Repair Completed') */}
                                        {repairStatus === 'Repair Completed' && status === 'in_progress' && ( // Only route if repair completed AND still in_progress
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

                                        {/* Display status if order is awaiting fulfillment routing (should not have buttons here) */}
                                        {status === 'awaiting_fulfillment' && (
                                            <Badge variant="default" className="capitalize">Awaiting Fulfillment Action</Badge> // Indicates it's in one of the fulfillment manager queues
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