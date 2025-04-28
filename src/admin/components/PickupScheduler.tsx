// src/admin/components/PickupScheduler.tsx
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
    MapPin, // Location icon (pickup address)
    CalendarDays, // Date icon
    DollarSign, // Price icon
    CreditCard, // Payment icon
    Search, // Search icon
    Loader2, // Loading spinner
    CheckCircle, // Picked icon
    Tag, // Repair Type
    Package, // Notes
    Clock, // Status icon
} from "lucide-react";
import { toast } from 'sonner';

// Import types - Using InitialMethod and FulfillmentMethod
import { Order, OrderStatus, InitialMethod, FulfillmentMethod, RepairStatus, PaymentStatus } from "@/types/order";

// Define filter status options for Pickup Scheduler (KitFix Picks Up)
const kitFixPickupStatuses: RepairStatus[] = [
    "Routed for Pickup (KitFix)", // Initial status from OrdersTable
    "Scheduled for Pickup (KitFix)", // Optional scheduling step
    "Item Picked Up (KitFix)", // After KitFix picks up
];
const relevantStatuses: RepairStatus[] = [...kitFixPickupStatuses];
type PickupFilterStatus = RepairStatus | 'all';


const PickupScheduler: React.FC = () => {
    const [filterStatus, setFilterStatus] = useState<PickupFilterStatus>('Routed for Pickup (KitFix)'); // Default filter
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Pickup statuses available for filtering
    const statusOptions: PickupFilterStatus[] = ['all', ...relevantStatuses];

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");

                // Query for orders in 'in_progress' status, and initialMethod === 'pickup'
                // These are orders that KitFix needs to pick up FROM the customer.
                // The query filters by main status and initial method.
                let q = query(
                    ordersRef,
                    where('processing.status', '==', 'in_progress' as OrderStatus), // Must be in_progress after routing from OrdersTable
                    where('processing.initialMethod', '==', 'pickup' as InitialMethod), // Initial method is pickup (KitFix picks up)
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

                // DEBUG: Log fetched orders before client-side filtering
                console.log("PickupScheduler: Fetched orders from Firestore (in_progress, initialMethod=pickup):", fetchedOrders);


                // Client-side filter to ensure they have a repair status relevant to this manager
                // This filters down the fetched orders based on the specific repairStatus values this manager handles.
                const relevantOrders = fetchedOrders.filter(order =>
                    order.processing?.repairStatus && relevantStatuses.includes(order.processing.repairStatus)
                );

                // DEBUG: Log orders after filtering by relevantStatuses
                console.log("PickupScheduler: Filtered orders by relevantStatuses:", relevantOrders);


                setOrders(relevantOrders); // Set the state with relevant orders

            } catch (error) {
                console.error("Error fetching KitFix pickup orders:", error);
                toast.error("Error fetching KitFix pickup orders", {
                    description: "Could not load orders for Pickup Scheduler.",
                });
            } finally {
                setLoading(false);
            }
        };

        // Fetch orders whenever the component mounts or db changes.
        // filterStatus and searchTerm changes are handled by client-side filtering below.
        fetchOrders();
        // Added db to dependencies (unlikely to change, but good practice)
    }, [db]);


    // Generic update function for pickup orders
    const updatePickupOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            const existingOrder = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrder) {
                console.error("Error: Order not found for pickup update:", orderId);
                toast.error("Update Failed", { description: "Order not found." });
                return false;
            }

            const updatedProcessing = updates.processing
                ? { ...existingOrder.processing, ...updates.processing }
                : existingOrder.processing;

            const finalUpdates: Partial<Order> = {
                ...updates,
                processing: updatedProcessing,
                updatedAt: serverTimestamp(), // Always update timestamp
            };

            await updateDoc(orderRef, finalUpdates);

            // Optimistically update local state
            const updatedOrder = { ...existingOrder, ...finalUpdates }; // Merge locally
            if (finalUpdates.processing) updatedOrder.processing = { ...existingOrder.processing, ...finalUpdates.processing };
            if (finalUpdates.payment) updatedOrder.payment = { ...existingOrder.payment, ...finalUpdates.payment };


            setOrders((prev) =>
                prev.map((o) => (o && o.id === orderId ? updatedOrder : o)) // Check for 'o' safety
            );

            return true;
        } catch (error) {
            console.error("Error updating KitFix pickup order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    // Action: Mark order as Scheduled for KitFix Pickup (Optional step)
    const markScheduledForKitFixPickup = async (order: Order, scheduleDate: string) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for scheduling
        if (order.processing.initialMethod !== 'pickup' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Routed for Pickup (KitFix)') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting scheduling for KitFix pickup.`);
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
                repairStatus: "Scheduled for Pickup (KitFix)" as RepairStatus, // Update repair status
                scheduledInitialPickupDate: scheduledTimestamp, // Save scheduled date as Timestamp
                // Keep main status as 'in_progress'
            },
        };
        const success = await updatePickupOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} scheduled for KitFix pickup.`);
    };


    // Action: Mark order as Picked Up by KitFix
    const markPickedUpByKitFix = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for marking as picked up
        if (order.processing.initialMethod !== 'pickup' || order.processing.status !== 'in_progress' || (order.processing.repairStatus !== 'Routed for Pickup (KitFix)' && order.processing.repairStatus !== 'Scheduled for Pickup (KitFix)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be marked as picked up by KitFix.`);
            return;
        }
        if (order.processing.repairStatus === 'Item Picked Up (KitFix)') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked as picked up by KitFix.`);
            return;
        }


        // Updates: Change repairStatus, add timestamp
        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Item Picked Up (KitFix)" as RepairStatus, // Set status for this initial phase
                actualInitialPickupDate: Timestamp.now(), // Record actual pickup time
                // Keep main status as 'in_progress'
            },
        };
        const success = await updatePickupOrder(order.id, updates);
        if (success) {
            toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Picked Up by KitFix.`);
            // This order is now ready for the Repair Manager
            // Perform a second update immediately to signal readiness for the Repair Manager
            const nextUpdates: Partial<Order> = {
                processing: {
                    // Need to fetch the latest state after the first update
                    // Or rely on optimistic update merging (less safe with multiple updates)
                    // Simplest: just set the *next* repairStatus
                    repairStatus: "Ready for Repair (from Pickup)" as RepairStatus, // Signal ready for Repair Manager
                },
            };
            // updatePickupOrder already fetches and merges, so we can use it again.
            // This will trigger another optimistic local state update.
            const secondSuccess = await updatePickupOrder(order.id, nextUpdates);
            if (secondSuccess) {
                toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} sent to Repair Queue.`);
            } else {
                toast.error(`Failed to send order ${order.id.slice(0, 6).toUpperCase()} to Repair Queue.`);
            }
        }
    };


    // --- Client-side Filtering and Searching ---
    // Filter by selected RepairStatus and Search Term
    const filteredAndSearchedOrders = orders.filter(order => {
        // Add safety check for processing and repairStatus
        if (!order.processing || !order.processing.repairStatus) return false;

        // 1. Filter by Status
        const statusMatch = filterStatus === 'all' || order.processing.repairStatus === filterStatus;

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

    // Add debugging log before mapping (after loading)
    console.log("PickupScheduler: Rendering Filtered Orders:", filteredAndSearchedOrders);


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
                            {status === 'all' ? 'All KitFix Pickup Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

                        const repairStatus = order.processing.repairStatus; // Use repairStatus for actions
                        const initialMethod = order.processing.initialMethod; // Get initial method for display
                        const fulfillmentMethod = order.processing.fulfillmentMethod; // Get fulfillment method for display


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
                                        {order.contactInfo?.address && initialMethod === 'pickup' && ( // KitFix picks up from customer address
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Pickup Address:</strong> {order.contactInfo.address}
                                            </p>
                                        )}
                                        {order.processing?.preferredDate && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-purple-500" />
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate}
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
                                        {/* Add more relevant details like price, payment status if needed */}
                                    </div>

                                    {/* --- Actions --- */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Use flex-wrap */}
                                        {/* Button/Input for Scheduling (Optional Step) */}
                                        {repairStatus === 'Routed for Pickup (KitFix)' && (
                                            <>
                                                {/* Could add a date picker input here */}
                                                <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => { /* Handle date change */ console.log(e.target.value); }} /> {/* Placeholder Input */}
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => markScheduledForKitFixPickup(order, '2023-10-27')} /* Replace '2023-10-27' with actual date from input */
                                                    disabled={isUpdatingOrderId === order.id}
                                                >
                                                    {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Schedule Pickup
                                                </Button>
                                            </>
                                        )}

                                        {/* Button to mark as Picked Up by KitFix */}
                                        {(repairStatus === 'Routed for Pickup (KitFix)' || repairStatus === 'Scheduled for Pickup (KitFix)') && (
                                            <Button
                                                size="sm"
                                                variant="default" // Use default for the final action before routing to repair
                                                onClick={() => markPickedUpByKitFix(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Mark Picked Up
                                            </Button>
                                        )}

                                        {/* Message if picked up and ready for repair */}
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