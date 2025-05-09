/* eslint-disable @typescript-eslint/no-unused-vars */
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
    MapPin, // Location icon
    CalendarDays, // Date icon
    Search, // Search icon
    Loader2, // Loading spinner
    Tag, // Repair Type
    Package
} from "lucide-react";
import { toast } from 'sonner';

// Import types
import { Order, OrderStatus, RepairStatus } from "@/types/order";

// Define filter status options for Dropoff Manager
// This manager shows orders in the initial dropoff phase OR the final customer pickup phase
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
    const [filterStatus, setFilterStatus] = useState<DropoffFilterStatus>('all'); // Default filter to all or an initial status
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Filter statuses available for filtering
    const statusOptions: DropoffFilterStatus[] = ['all', ...relevantStatuses];


    useEffect(() => {
        setLoading(true); // Start loading when the effect runs

        const ordersRef = collection(db, "orders");

        // Query to fetch ALL orders in 'in_progress' OR 'awaiting_fulfillment' status
        // This avoids complex `or` query syntax and is necessary for client-side filtering by method/specific repair status.
        // Requires index on processing.status.
        const q = query(
            ordersRef,
            where('processing.status', 'in', ['in_progress', 'awaiting_fulfillment'] as OrderStatus[]), // Fetch relevant main statuses
            orderBy("createdAt", "desc") // Order by creation date
        );

        // Use onSnapshot for real-time updates
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

            // DEBUG: Log fetched orders from Firestore
            console.log("DropoffManager: Fetched orders from Firestore (in_progress or awaiting_fulfillment):", fetchedOrders);


            // Client-side filter to include only orders relevant to THIS MANAGER VIEW
            // Orders must be:
            // 1. initialMethod == 'dropoff' AND repairStatus is one of the dropoffInitialStatuses
            // OR
            // 2. fulfillmentMethod == 'pickup' AND repairStatus is one of the customerPickupStatuses
            const relevantOrders = fetchedOrders.filter(order => {
                if (!order.processing || !order.processing.repairStatus || !order.processing.initialMethod || !order.processing.fulfillmentMethod) {
                    // console.warn("Skipping order with incomplete processing data:", order.id, order.processing);
                    return false; // Must have essential processing fields
                }

                const { initialMethod, fulfillmentMethod, repairStatus } = order.processing;

                // Check if it matches the criteria for the initial dropoff phase
                const isInitialDropoff = initialMethod === 'dropoff' && dropoffInitialStatuses.includes(repairStatus);

                // Check if it matches the criteria for the final customer pickup phase
                const isCustomerPickup = fulfillmentMethod === 'pickup' && customerPickupStatuses.includes(repairStatus);

                // Include the order if it matches either phase criteria
                return isInitialDropoff || isCustomerPickup;
            });

            // DEBUG: Log orders after filtering by relevance to this manager
            console.log("DropoffManager: Filtered orders by relevance to this manager:", relevantOrders);


            setOrders(relevantOrders); // Set the state with relevant orders
            setLoading(false); // Set loading to false AFTER receiving the first snapshot
        }, (error) => {
            console.error("DropoffManager: Error fetching real-time orders:", error);
            toast.error("Real-time updates failed for dropoff/pickup orders.");
            setLoading(false); // Ensure loading is off on error
        });

        // Cleanup function: Unsubscribe when the component unmounts or the effect re-runs
        return () => {
            console.log("DropoffManager: Unsubscribing from snapshot listener.");
            unsubscribe();
        };

        // Dependencies: Add dependencies that could change the query.
        // The query depends on db. The client-side filtering depends on filterStatus and searchTerm,
        // but we want to refetch the *full set* of relevant orders when filterStatus changes
        // so client-side filtering can re-apply correctly. searchTerm is purely client-side.
    }, [filterStatus, db]); // Depend on filterStatus to re-run fetch/listener


    // Generic update function for dropoff orders
    // Removed local state update logic to rely solely on onSnapshot
    const updateDropoffOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
        setIsUpdatingOrderId(orderId); // Set updating state
        try {
            const orderRef = doc(db, "orders", orderId);
            // Fetch existing is still useful for merging nested objects accurately before sending to Firestore
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
                : existingOrder.processing;

            const finalUpdates: Partial<Order> = {
                ...updates,
                processing: updatedProcessing,
                updatedAt: serverTimestamp(), // Always update timestamp
            };

            await updateDoc(orderRef, finalUpdates);

            // Rely on onSnapshot to update the 'orders' state

            console.log(`Order ${orderId} Firestore updated.`);

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


    // --- Actions for Initial Dropoff Phase (initialMethod === 'dropoff', status === 'in_progress') ---

    // Action: Mark order as Dropped off by Customer
    const markItemDroppedOff = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if order is in the correct phase/status
        if (order.processing.initialMethod !== 'dropoff' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Routed to Dropoff') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting dropoff.`);
            return;
        }

        // Updates: Change repairStatus and add timestamp
        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Item Dropped Off" as RepairStatus, // Set dropped off status
                actualCustomerDropoffDate: Timestamp.now(), // Record the actual dropoff time
                // Keep main status as 'in_progress'
            },
        };

        const success = await updateDropoffOrder(order.id, updates);
        if (success) {
            toast.success("Order Dropped Off", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as dropped off.`,
            });
            // onSnapshot will update the list and filtering
        }
    };

    // Action: Mark as Ready for Repair (Explicit step after Item Dropped Off)
    const markReadyForRepairFromDropoff = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if order is in the correct phase/status
        if (order.processing.initialMethod !== 'dropoff' || order.processing.status !== 'in_progress' || order.processing.repairStatus !== 'Item Dropped Off') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be sent to repair.`);
            return;
        }

        // Updates: Change repairStatus
        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Ready for Repair (from Dropoff)" as RepairStatus, // Set as ready within dropoff flow
                // Keep main status as 'in_progress'
            },
        };

        const success = await updateDropoffOrder(order.id, updates);

        if (success) {
            toast.success("Order Ready for Repair", {
                description: `Order ${order.id.slice(0, 6).toUpperCase()} marked as ready for repair.`,
            });
            // onSnapshot will update the list and filtering
        }
    };


    // --- Actions for Final Customer Pickup Phase (fulfillmentMethod === 'pickup', status === 'awaiting_fulfillment') ---

    // Action: Mark Ready for Customer Pickup (This status is set by RepairManager)
    // This manager just needs to display orders in this state and provide the final action.

    // Action: Mark as Scheduled for Customer Pickup (Optional step in fulfillment)


    // Action: Mark as Picked Up by Customer
    const markPickedUpByCustomer = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate
        if (order.processing.fulfillmentMethod !== 'pickup' || order.processing.status !== 'awaiting_fulfillment' || (order.processing.repairStatus !== 'Ready for Customer Pickup' && order.processing.repairStatus !== 'Scheduled for Pickup (Customer)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to be marked as picked up by customer.`);
            return;
        }
        if (order.processing.repairStatus as RepairStatus === 'Picked Up by Customer') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already marked as picked up by customer.`);
            return;
        }


        // Updates: Change main status and repairStatus, add timestamp
        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "fulfilled" as OrderStatus, // CHANGE main status to fulfilled
                repairStatus: "Picked Up by Customer" as RepairStatus, // Set final status
                actualCustomerPickupDate: Timestamp.now(), // Record actual pickup time
                // Consider clearing fulfillment specific timestamps/locations?
                // readyForFulfillmentAt: null // Set to null to remove or clear
            },
        };
        const success = await updateDropoffOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Picked Up by Customer and Fulfilled.`);
    };


    // --- Client-side Filtering and Searching ---
    // Filter by selected RepairStatus and Search Term
    const filteredAndSearchedOrders = orders.filter(order => {
        // Add safety check for processing and repairStatus
        if (!order.processing || !order.processing.repairStatus) return false;

        // 1. Filter by Status
        const statusMatch = filterStatus === 'all' || order.processing.repairStatus === filterStatus; // <--- filterStatus is used here

        if (!statusMatch) return false;

        // 2. Filter by Search Term
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (lowerSearchTerm === '') return true;

        const customerName = order.contactInfo?.name?.toLowerCase() || '';
        const orderIdPartial = order.id.slice(0, 6).toLowerCase();

        return customerName.includes(lowerSearchTerm) || orderIdPartial.includes(lowerSearchTerm);
    });


    if (loading) {
        // You can reuse the Skeleton loader structure
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    // Add debugging log before mapping
    console.log("DropoffManager: Rendering Filtered Orders (after loading check):", filteredAndSearchedOrders);


    // Updated empty state message
    let emptyMessage = "No orders found.";
    if (filterStatus !== 'all') { // <--- filterStatus is used here
        emptyMessage = `No "${filterStatus.replace(/_/g, ' ')}" orders found.`;
    }
    if (searchTerm) {
        emptyMessage = `No orders found matching "${searchTerm}"` + (filterStatus !== 'all' ? ` with status "${filterStatus.replace(/_/g, ' ')}".` : '.'); // <--- filterStatus is used here
    }


    return (
        <div className="space-y-6">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-3">
                    {statusOptions.map(status => (
                        <Button
                            key={status}
                            variant={filterStatus === status ? 'default' : 'outline'} // <--- filterStatus is used here
                            onClick={() => setFilterStatus(status)} // <--- setFilterStatus is used here
                            size="sm"
                        >
                            {status === 'all' ? 'All Dropoff/Pickup Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {/* Basic formatting */}
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

                        const { initialMethod, fulfillmentMethod, repairStatus } = order.processing;

                        // Determine which phase the order is in for rendering logic based on REPAIR STATUS
                        // An order is in the initial dropoff phase if its repairStatus is one of the initial dropoff statuses
                        const isInInitialDropoffPhase = dropoffInitialStatuses.includes(repairStatus);
                        // An order is in the customer pickup fulfillment phase if its repairStatus is one of the customer pickup fulfillment statuses
                        const isInCustomerPickupPhase = customerPickupStatuses.includes(repairStatus);
                        // Note: An order should only be in ONE phase at a time based on its repairStatus

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
                                        {/* Add more relevant details like preferredDate, locations, timestamps etc. */}
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
                                        {/* Show relevant locations based on method and phase */}
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
                                        {/* Show relevant timestamps */}
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

                                    {/* --- Actions --- */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        {/* Actions for Initial Dropoff Phase */}
                                        {isInInitialDropoffPhase && (
                                            <>
                                                {repairStatus === 'Routed to Dropoff' && (
                                                    <Button
                                                        size="sm"
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
                                                        variant="secondary"
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

                                        {/* Actions for Final Customer Pickup Phase */}
                                        {isInCustomerPickupPhase && (
                                            <>
                                                {repairStatus === 'Ready for Customer Pickup' && (
                                                    <>
                                                        {/* Optional: Schedule pickup step */}
                                                        {/* <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => {}} /> */}
                                                        {/* <Button size="sm" variant="secondary" onClick={() => markScheduledForCustomerPickup(order, 'date')} disabled={isUpdatingOrderId === order.id}>
                                                               Schedule Pickup
                                                              </Button> */}
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => markPickedUpByCustomer(order)}
                                                            disabled={isUpdatingOrderId === order.id}
                                                        >
                                                            {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Mark Picked Up
                                                        </Button>
                                                    </>
                                                )}
                                                {repairStatus === 'Scheduled for Pickup (Customer)' && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
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