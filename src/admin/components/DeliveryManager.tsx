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
    Clock, // Status icon
} from "lucide-react";
import { toast } from 'sonner';

// Import types
import { Order, OrderStatus, InitialMethod, FulfillmentMethod, RepairStatus, PaymentStatus } from "@/types/order";

// Define filter status options for Delivery Manager (KitFix Delivers)
const kitFixDeliveryStatuses: RepairStatus[] = [
    "Ready for KitFix Delivery", // Initial status from RepairManager
    "Scheduled for Delivery (KitFix)", // Optional scheduling step
    "Out for Delivery", // Set by DeliveryManager
    "Delivered to Customer", // Final status set by DeliveryManager
];
const relevantStatuses: RepairStatus[] = [...kitFixDeliveryStatuses];
type DeliveryFilterStatus = RepairStatus | 'all';


const DeliveryManager: React.FC = () => {
    // --- ALL HOOKS MUST BE AT THE TOP LEVEL ---
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // Corrected line: Added = useState()
    const [filterStatus, setFilterStatus] = useState<DeliveryFilterStatus>('Ready for KitFix Delivery'); // State for filter
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);

    // Delivery statuses available for filtering (uses filterStatus type)
    const statusOptions: DeliveryFilterStatus[] = ['all', ...relevantStatuses];

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");

                // Query for orders in 'awaiting_fulfillment' status, and fulfillmentMethod === 'delivery'
                // AND repairStatus is relevant to this manager's view (client-side filter)
                let q = query(
                    ordersRef,
                    where('processing.status', '==', 'awaiting_fulfillment' as OrderStatus),
                    where('processing.fulfillmentMethod', '==', 'delivery' as FulfillmentMethod), // Fulfillment method is delivery
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
                console.log("DeliveryManager: Fetched orders from Firestore (awaiting_fulfillment, fulfillmentMethod=delivery):", fetchedOrders);


                // Client-side filter to ensure they have a repair status relevant to this manager
                const relevantOrders = fetchedOrders.filter(order =>
                    order.processing?.repairStatus && relevantStatuses.includes(order.processing.repairStatus)
                );

                // DEBUG: Log orders after filtering by relevantStatuses
                console.log("DeliveryManager: Filtered orders by relevantStatuses:", relevantOrders);


                setOrders(relevantOrders); // Set the state with relevant orders

            } catch (error) {
                console.error("Error fetching KitFix delivery orders:", error);
                toast.error("Error fetching KitFix delivery orders", {
                    description: "Could not load orders for Delivery Manager.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [db]); // Dependency array - filter/search are client-side


    // Generic update function
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
                updatedAt: serverTimestamp(), // Always update timestamp
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
            console.error("Error updating KitFix delivery order:", error);
            toast.error("Update Failed", {
                description: `Could not update order ${orderId.slice(0, 6).toUpperCase()}.`,
            });
            return false;
        } finally {
            setIsUpdatingOrderId(null);
        }
    };

    // Action: Mark order as Scheduled for KitFix Delivery (Optional step)
    const markScheduledForKitFixDelivery = async (order: Order, scheduleDate: string) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || order.processing.repairStatus !== 'Ready for KitFix Delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not awaiting scheduling for KitFix delivery.`);
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
                repairStatus: "Scheduled for Delivery (KitFix)" as RepairStatus, // Update repair status
                scheduledKitFixDeliveryDate: scheduledTimestamp, // Save scheduled date as Timestamp
                // Keep main status as 'awaiting_fulfillment'
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} scheduled for KitFix delivery.`);
    };


    // Action: Mark order as Out for Delivery
    const markOutForDelivery = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || (order.processing.repairStatus !== 'Ready for KitFix Delivery' && order.processing.repairStatus !== 'Scheduled for Delivery (KitFix)')) {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} is not ready to go out for delivery.`);
            return;
        }
        if (order.processing.repairStatus === 'Out for Delivery') {
            toast.info(`Order ${order.id.slice(0, 6).toUpperCase()} is already out for delivery.`);
            return;
        }


        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                repairStatus: "Out for Delivery" as RepairStatus, // Update repair status
                // Maybe set out for delivery timestamp? outForDeliveryAt: Timestamp.now() // Add this timestamp field if needed
                // Keep main status as 'awaiting_fulfillment'
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Out for Delivery.`);
    };

    // Action: Mark order as Delivered to Customer
    const markDeliveredToCustomer = async (order: Order) => {
        if (!order || !order.id || !order.processing) {
            toast.error("Action Failed", { description: "Order data is incomplete." });
            return;
        }
        // Check if status is appropriate for delivery
        if (order.processing.fulfillmentMethod !== 'delivery' || order.processing.status !== 'awaiting_fulfillment' || order.processing.repairStatus !== 'Out for Delivery') {
            toast.warning(`Order ${order.id.slice(0, 6).toUpperCase()} must be out for delivery to be marked delivered.`);
            return;
        }

        const updates: Partial<Order> = {
            processing: {
                ...order.processing,
                status: "fulfilled" as OrderStatus, // CHANGE main status to fulfilled
                repairStatus: "Delivered to Customer" as RepairStatus, // Set final status
                actualKitFixDeliveryDate: Timestamp.now(), // Record actual delivery time
                // Consider clearing fulfillment specific timestamps/locations?
                // readyForFulfillmentAt: null // Set to null to remove or clear
            },
        };
        const success = await updateDeliveryOrder(order.id, updates);
        if (success) toast.success(`Order ${order.id.slice(0, 6).toUpperCase()} marked as Delivered and Fulfilled.`);
    };


    // --- Client-side Filtering and Searching ---
    // Filter by selected RepairStatus and Search Term
    const filteredAndSearchedOrders = orders.filter(order => {
        // Add safety check for processing and repairStatus
        if (!order.processing || !order.processing.repairStatus) return false;

        // 1. Filter by Status
        const statusMatch = filterStatus === 'all' || order.processing.repairStatus === filterStatus; // <-- filterStatus is used here

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
    console.log("DeliveryManager: Rendering Filtered Orders:", filteredAndSearchedOrders);


    // Updated empty state message
    let emptyMessage = "No orders found.";
    if (filterStatus !== 'all') { // <-- filterStatus is used here
        emptyMessage = `No "${filterStatus.replace(/_/g, ' ')}" orders found.`;
    }
    if (searchTerm) {
        emptyMessage = `No orders found matching "${searchTerm}"` + (filterStatus !== 'all' ? ` with status "${filterStatus.replace(/_/g, ' ')}".` : '.'); // <-- filterStatus is used here
    }


    return (
        <div className="space-y-6">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-3">
                    {statusOptions.map(status => (
                        <Button
                            key={status}
                            variant={filterStatus === status ? 'default' : 'outline'} // <-- filterStatus is used here
                            onClick={() => setFilterStatus(status)} // <-- setFilterStatus is used here
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
                    {filteredAndSearchedOrders.map((order) => { // Corrected typo here
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
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${repairStatus === "Delivered to Customer"
                                                ? "bg-green-100 text-green-600"
                                                : repairStatus === "Out for Delivery"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : repairStatus === "Scheduled for Delivery (KitFix)"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : "bg-gray-100 text-gray-600" // Default for Ready for KitFix Delivery
                                                }`}
                                        >
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
                                        {/* Display Delivery Address - use contactInfo.address as intended */}
                                        {order.contactInfo?.address && ( // Display contactInfo.address for KitFix Delivery
                                            <p className="text-gray-700">
                                                <MapPin className="inline mr-1 h-4 w-4 text-red-500" />
                                                <strong>Delivery Address:</strong> {order.contactInfo.address}
                                            </p>
                                        )}
                                        {order.processing?.preferredDate && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-purple-500" />
                                                <strong>Preferred Date:</strong> {order.processing.preferredDate}
                                            </p>
                                        )}
                                        {order.processing?.scheduledKitFixDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-blue-500" />
                                                <strong>Scheduled:</strong> {format(new Date(order.processing.scheduledKitFixDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {order.processing?.actualKitFixDeliveryDate?.seconds && (
                                            <p className="text-gray-700">
                                                <CalendarDays className="inline mr-1 h-4 w-4 text-green-500" />
                                                <strong>Delivered:</strong> {format(new Date(order.processing.actualKitFixDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}
                                            </p>
                                        )}
                                        {/* Add more relevant details like price, payment status if needed */}
                                    </div>

                                    {/* --- Actions --- */}
                                    <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Use flex-wrap */}
                                        {/* Button/Input for Scheduling (Optional Step) */}
                                        {repairStatus === 'Ready for KitFix Delivery' && (
                                            <>
                                                {/* Could add a date/time picker input here */}
                                                <Input type="date" className="w-auto sm:w-auto min-w-[120px]" onChange={(e) => { /* Handle date change */ console.log(e.target.value); }} /> {/* Placeholder Input */}
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => markScheduledForKitFixDelivery(order, '2023-10-27')} /* Replace '2023-10-27' with actual date from input */
                                                    disabled={isUpdatingOrderId === order.id}
                                                >
                                                    {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Schedule Delivery
                                                </Button>
                                            </>
                                        )}

                                        {/* Button to mark as Out for Delivery */}
                                        {(repairStatus === 'Ready for KitFix Delivery' || repairStatus === 'Scheduled for Delivery (KitFix)') && (
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
                                        {repairStatus === 'Out for Delivery' && (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => markDeliveredToCustomer(order)}
                                                disabled={isUpdatingOrderId === order.id}
                                            >
                                                {isUpdatingOrderId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <CheckCircle className="mr-1 h-4 w-4" /> Mark Delivered
                                            </Button>
                                        )}


                                        {/* Message if delivered */}
                                        {repairStatus === 'Delivered to Customer' && (
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