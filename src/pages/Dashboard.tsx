/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { logoutUser } from '@/services/authService'; // Assuming this exists
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Shirt,
    CalendarDays,
    Truck,
    History,
    User,
    Mail,
    Phone,
    Tag,
    Package,
    DollarSign,
    MapPin,
    Loader2
} from 'lucide-react';
import ProgressStepper from '@/components/ProgressStepper'; // Assuming this component exists and is updated

// Import types from your order.ts
import { Order, ProcessingInfo } from '@/types/order';
import { Badge } from '@/components/ui/badge';

// Define a UserData interface based on what you save in 'users' collection
interface UserData {
    name: string;
    email: string;
    // Add other user fields if you save them
}


// Helper function to map internal status to customer-friendly steps and current index
const getProcessingSteps = (order: Order): { steps: string[], currentStep: number } => {
    // Safely access nested properties
    const processing = order?.processing || {} as ProcessingInfo; // Cast to ensure type structure
    const {
        deliveryMethod, // Could be ambiguous based on type def
        initialMethod, // How it gets TO KitFix ('pickup', 'dropoff')
        fulfillmentMethod, // How it gets BACK to customer ('pickup', 'delivery')
        repairStatus,
        status, // Overall OrderStatus like "pending", "fulfilled", "cancelled"
        actualCustomerPickupDate,
        actualKitFixDeliveryDate,
    } = processing;


    let steps: string[];
    let flowIdentifier: string | null = null; // For debugging logs


    // 1. Determine the correct Customer-Friendly Steps array based on the order's methods
    // Use a more explicit method determination based on initial/fulfillment methods
    if (initialMethod === 'dropoff' && fulfillmentMethod === 'pickup') {
        // Customer drops off, Customer picks up from KitFix
        steps = ['Order Placed', 'Awaiting Dropoff', 'Item Dropped Off', 'In Repair', 'Ready for Pickup', 'Picked Up'];
        flowIdentifier = 'dropoff_pickup';
    } else if (initialMethod === 'pickup' && fulfillmentMethod === 'delivery') {
        // KitFix picks up, KitFix delivers back
        steps = ['Order Placed', 'KitFix Picking Up', 'Item Picked Up', 'In Repair', 'Ready for Delivery', 'Delivered'];
        flowIdentifier = 'pickup_delivery';
    } else if (initialMethod === ('delivery' as string) && fulfillmentMethod === 'delivery') {
        // Customer mails in, KitFix delivers back
        steps = ['Order Placed', 'Item Sent to KitFix', 'Item Received at KitFix', 'In Repair', 'Ready for Delivery', 'Out for Delivery', 'Delivered'];
        flowIdentifier = 'delivery_delivery';
    }
    // Fallback if initial/fulfillment methods don't match a standard combination
    // or if they are missing. Use the ambiguous 'deliveryMethod' if it exists and matches known types.
    // NOTE: This fallback might still cause issues if deliveryMethod is set but doesn't match the actual flow
    // derived from initial/fulfillment methods. The ideal solution is ensuring initial/fulfillment/deliveryMethod
    // are set correctly and consistently when the order is created/updated.
    else if (deliveryMethod === 'dropoff') { // Fallback to using deliveryMethod if initial/fulfillment isn't standard
        steps = ['Order Placed', 'Awaiting Dropoff', 'Item Dropped Off', 'In Repair', 'Ready for Pickup', 'Picked Up'];
        flowIdentifier = 'fallback_deliveryMethod_dropoff';
        console.warn(`Order ${order?.id}: Using deliveryMethod 'dropoff' steps as fallback.`);
    } else if (deliveryMethod === 'pickup') { // Fallback
        steps = ['Order Placed', 'KitFix Picking Up', 'Item Picked Up', 'In Repair', 'Ready for Delivery', 'Delivered'];
        flowIdentifier = 'fallback_deliveryMethod_pickup';
        console.warn(`Order ${order?.id}: Using deliveryMethod 'pickup' steps as fallback.`);
    } else if (deliveryMethod === 'delivery') { // Fallback
        steps = ['Order Placed', 'Item Sent to KitFix', 'Item Received at KitFix', 'In Repair', 'Ready for Delivery', 'Out for Delivery', 'Delivered'];
        flowIdentifier = 'fallback_deliveryMethod_delivery';
        console.warn(`Order ${order?.id}: Using deliveryMethod 'delivery' steps as fallback.`);
    }
    // Final fallback to the simplest sequence if no specific method combination or deliveryMethod matches
    else {
        steps = ['Order Placed', 'Item Received', 'In Repair', 'Completed'];
        flowIdentifier = 'default_fallback';
        console.warn(`Order ${order?.id}: Using default steps due to missing or unhandled initial/fulfillment/delivery methods (initial: ${initialMethod}, fulfillment: ${fulfillmentMethod}, delivery: ${deliveryMethod}).`);
    }

    // console.log(`Order ${order?.id}: Step flow determined via: ${flowIdentifier}`); // Optional debug log

    // Ensure steps array is valid before proceeding
    if (!Array.isArray(steps) || steps.length === 0) {
        console.error("Could not determine valid steps for order:", order?.id, "with processing:", processing);
        return { steps: ['Error Loading Progress'], currentStep: 0 }; // Graceful failure
    }

    const lastStepIndex = steps.length - 1;
    let currentStepIndex = 0; // Default to 'Order Placed' (index 0)
    let potentialStepLabel: string | null = null; // Use label first, then find index


    // --- Prioritize mapping based on progression ---

    // 1. Final Completion States (Highest Priority Override)
    // If any definitive final state indicator is true, set the current step to the very last step index.
    // This ensures the stepper shows the final step as completed (all green checks).
    const orderIsFulfilled = status === 'fulfilled';
    const customerPickedUp = repairStatus === 'Picked Up by Customer' || (actualCustomerPickupDate && actualCustomerPickupDate instanceof Timestamp);
    const kitFixDelivered = repairStatus === 'Delivered to Customer' || (actualKitFixDeliveryDate && actualKitFixDeliveryDate instanceof Timestamp);

    if (orderIsFulfilled || customerPickedUp || kitFixDelivered) {
        return { steps, currentStep: lastStepIndex }; // Process is completed, all steps should show green
    }

    // Order status 'completed' is also a final state indicator, often synonymous with 'fulfilled'
    if (status === 'completed') {
        // In the default flow, 'Completed' is the last step. In others, fulfilled is the last.
        // Map to the last step index for 'completed' status as well, unless it's explicitly the 'Completed' label in default flow.
        const completedStepIndex = steps.indexOf('Completed');
        if (completedStepIndex !== -1 && completedStepIndex === lastStepIndex) {
            return { steps, currentStep: completedStepIndex }; // Highlight 'Completed' if it's the last step
        } else if (status === 'completed') {
            // If status is 'completed' but 'Completed' isn't the last step label,
            // it's likely a final state like 'fulfilled'. Map to the last step index.
            return { steps, currentStep: lastStepIndex };
        }
    }


    // 2. Map specific repair statuses to their corresponding step labels
    // Determine the target step label based on the repairStatus.
    // The order of cases is generally from beginning of the process towards the end.
    switch (repairStatus) {
        // --- Initial State ---
        case 'Pending Routing':
            potentialStepLabel = 'Order Placed'; // Index 0
            break;

        // --- Initial Routing/Scheduling states (item is on its way TO KitFix or awaiting dropoff) ---
        case 'Routed to Dropoff':
            // In Dropoff flow: User wants Green 0, Highlighted 1 ('Awaiting Dropoff')
            potentialStepLabel = 'Awaiting Dropoff'; // Index 1 in dropoff flow
            break;

        case 'Scheduled for Pickup (KitFix)':
        case 'Routed for Pickup (KitFix)':
            // In Pickup flow: User wants Green 0, Highlighted 1 ('KitFix Picking Up')
            potentialStepLabel = 'KitFix Picking Up'; // Index 1 in pickup flow
            break;

        // case 'Item Sent to KitFix':
        //     // In Delivery flow: Item is on its way via mail-in - step 1
        //     potentialStepLabel = 'Item Sent to KitFix'; // Index 1 in delivery flow
        //     break;


        // --- Initial Receipt states (item has arrived at KitFix) ---
        // These map to the step *after* the initial pickup/dropoff/mail-in, but *before* In Repair.
        case 'Item Dropped Off':
        case 'Ready for Repair (from Dropoff)': // Item is at KitFix via customer dropoff, ready for repair routing/assignment
            // In Dropoff flow: User wants Green 0, Highlighted 1 ('Item Received'). Mapping to Index 1 contradicts step 2 'Item Dropped Off'.
            // Based on your feedback, the requested state for "Item Dropped Off" was green 0, highlighted 1, which means mapping to 'Awaiting Dropoff'.
            // This seems inconsistent with the actual status name. Let's stick to mapping the status name to the corresponding label, which is 'Item Dropped Off' (Index 2).
            potentialStepLabel = 'Item Dropped Off'; // Index 2 in dropoff flow
            break;

        case 'Item Picked Up (KitFix)':
        case 'Ready for Repair (from Pickup)': // Item is at KitFix via KitFix pickup, ready for repair routing/assignment
            // In Pickup flow: User wants Green up to Index 1 ('KitFix Picking Up'), highlighted Index 3 ('In Repair').
            // This skips Index 2 ('Item Picked Up'). Explicitly map to 'In Repair' as requested.
            potentialStepLabel = 'In Repair'; // Index 3 in pickup flow (skipping Index 2)
            break;

        case 'Sent to Repair Manager': // Item has arrived at KitFix after mail-in/shipping, sent to repair queue
            // In Delivery flow: Maps to step representing arrival at KitFix facility based on the flow.
            if (steps.includes('Item Received at KitFix')) { // Specific label for delivery flow
                potentialStepLabel = 'Item Received at KitFix'; // Index 2 in delivery flow
            } else {
                // Fallback for other flows if 'Sent to Repair Manager' somehow used
                console.warn(`repairStatus 'Sent to Repair Manager' encountered in non-'delivery' flow? Order ${order?.id} (Method: ${deliveryMethod}). Attempting fallback mapping.`);
                if (steps.includes('Item Dropped Off')) potentialStepLabel = 'Item Dropped Off'; // Index 2 in dropoff
                else if (steps.includes('Item Picked Up')) potentialStepLabel = 'Item Picked Up'; // Index 2 in pickup
                else if (steps.includes('Item Received')) potentialStepLabel = 'Item Received'; // Index 1 in default
            }
            break;

        // --- Repair states (item is currently being repaired) ---
        // These statuses map to the 'In Repair' step.
        case 'Assigned': // Assigned to technician
        case 'In Repair':
            // User wants green up to Index 1/2, highlighted 'In Repair' (Index 3 or 4).
            potentialStepLabel = 'In Repair'; // Maps to label in all flows where it exists
            break;

        // --- Post-Repair / Fulfillment Routing states ---
        // These statuses map to the step *after* 'In Repair' but before the final pickup/delivery.
        case 'Repair Completed':
            // User wants green up to "In Repair", highlighted "Completed" (meaning the step AFTER In Repair).
            // Find the appropriate label that exists in the *current* flow's steps array.
            if (steps.includes('Ready for Pickup')) { // For dropoff/pickup fulfillment flow
                potentialStepLabel = 'Ready for Pickup'; // Index 4 in dropoff flow
            } else if (steps.includes('Ready for Delivery')) { // For pickup/delivery fulfillment flows
                potentialStepLabel = 'Ready for Delivery'; // Index 4 in pickup, Index 4 in delivery flow
            } else if (steps.includes('Completed')) { // For the default fallback flow
                potentialStepLabel = 'Completed'; // Index 3 in default flow
            } else {
                console.error(`repairStatus 'Repair Completed' encountered but no standard post-repair step found for order ${order?.id} (Flow: ${flowIdentifier}). Steps: [${steps.join(', ')}]`);
            }
            break;

        case 'Ready for Customer Pickup':
            // User wants green up to "In Repair", highlighted "Completed" (meaning 'Ready for Pickup').
            potentialStepLabel = 'Ready for Pickup'; // Index 4 in dropoff/pickup fulfillment flow
            break;

        case 'Ready for KitFix Delivery':
            // User wants green up to "In Repair", highlighted "Completed" (meaning 'Ready for Delivery').
            potentialStepLabel = 'Ready for Delivery'; // Index 4 in pickup and delivery fulfillment flows
            break;

        case 'Scheduled for Pickup (Customer)':
            // User wants green up to "In Repair", highlighted "Completed" (meaning 'Ready for Pickup').
            // This status means customer pickup from KitFix is scheduled. Still 'Ready for Pickup'.
            potentialStepLabel = 'Ready for Pickup'; // Index 4 in dropoff/pickup fulfillment flow
            break;

        case 'Scheduled for Delivery (KitFix)':
            // User wants green up to "In Repair", highlighted "Completed" (meaning 'Ready for Delivery').
            // This status means KitFix delivery is scheduled. Still 'Ready for Delivery'.
            potentialStepLabel = 'Ready for Delivery'; // Index 4 in pickup and delivery fulfillment flows
            break;

        case 'Out for Delivery':
            // User wants green up to "In Repair", highlighted "Completed" (meaning 'Out for Delivery').
            potentialStepLabel = 'Out for Delivery'; // Index 5 in delivery fulfillment flow
            break;

        // --- Final Fulfillment States (handled by the override at the top) ---
        // 'Picked Up by Customer' -> Handled by override (last step - all green)
        // 'Delivered to Customer' -> Handled by override (last step - all green)
        // 'fulfilled' order status -> Handled by override (last step - all green)


        // --- Fallback/Unhandled Statuses ---
        default:
            // If repairStatus is set but didn't match any case above, and it's not 'Pending Routing',
            // it means there's an unmapped status. Log a warning.
            if (repairStatus && repairStatus !== 'Pending Routing') {
                console.warn(`Unmapped repairStatus '${repairStatus}' for order ${order?.id} (Flow: ${flowIdentifier}). Cannot determine specific step label.`);
            }
            // If repairStatus is null/undefined/unmapped AND the main order status is 'pending',
            // ensure we are on step 0. This covers the initial state reliably.
            if ((!repairStatus || repairStatus === 'Pending Routing') && status === 'pending') {
                potentialStepLabel = 'Order Placed'; // Explicitly force to step 0 label if pending and no other status matched
            }
            break;
    }

    // Find the index for the determined label within the determined steps array
    // Only update currentStepIndex if a valid label was determined AND found in steps.
    if (potentialStepLabel !== null) {
        const index = steps.indexOf(potentialStepLabel);
        if (index !== -1) {
            currentStepIndex = index;
        } else {
            // This indicates a configuration mismatch: a repairStatus mapped to a label
            // that doesn't exist in the steps list for this order's flow.
            // Log an error. currentStepIndex remains at its default 0 or a previous value.
            console.error(`Mapped step label '${potentialStepLabel}' (from repairStatus '${repairStatus}') not found in steps array for order ${order?.id} (Flow: ${flowIdentifier}). Steps: [${steps.join(', ')}]`);
        }
    }
    // else: potentialStepLabel remained null (unmapped status, not pending/initial).
    // currentStepIndex remains at its initial 0.


    // Ensure currentStep is within bounds [0, steps.length - 1] - Important safety
    currentStepIndex = Math.max(0, Math.min(currentStepIndex, lastStepIndex));

    // Added a final check specifically for the 'Ready for...' statuses IF
    // the determined index is still 0, which indicates a likely mismatch.
    // This acts as a safeguard to bump it forward if the flow seems to be
    // identified incorrectly, preventing it from sticking at step 0 for later statuses.
    if (currentStepIndex === 0 && (repairStatus === 'Ready for Customer Pickup' || repairStatus === 'Ready for KitFix Delivery')) {
        // If we're in a 'Ready for...' status but the index is still 0,
        // it means the steps array determined above didn't contain the
        // 'Ready for Pickup' or 'Ready for Delivery' label.
        // This happens if the default flow was chosen but the status is for a specific flow.
        // Let's try to find the 'In Repair' step (typically before 'Ready for...')
        // or the step after 'In Repair' in the default flow ('Completed')
        // as a better fallback than step 0.
        const inRepairIndex = steps.indexOf('In Repair');
        const completedIndex = steps.indexOf('Completed');

        if (inRepairIndex !== -1 && inRepairIndex < lastStepIndex) {
            // If 'In Repair' exists and isn't the last step, highlight the step *after* it.
            currentStepIndex = inRepairIndex + 1;
            console.warn(`Order ${order?.id}: Safeguard: 'Ready for...' status but index was 0. Advancing to step after 'In Repair' (${currentStepIndex}).`);
        } else if (completedIndex !== -1) {
            // If 'In Repair' isn't found but 'Completed' is (likely default flow), highlight 'Completed'.
            currentStepIndex = completedIndex;
            console.warn(`Order ${order?.id}: Safeguard: 'Ready for...' status but index was 0. Advancing to 'Completed' step (${currentStepIndex}).`);
        } else if (lastStepIndex > 0) {
            // Final safety: if we still can't find relevant steps, go to step 1
            currentStepIndex = 1;
            console.warn(`Order ${order?.id}: Safeguard: 'Ready for...' status but index was 0 and standard post-repair steps not found. Advancing to step 1 (${currentStepIndex}).`);
        }
        // If lastStepIndex is 0, currentStepIndex stays 0.
    }


    return { steps, currentStep: currentStepIndex };
};


/**
 * Dashboard component that displays user-specific information and allows management of repair orders.
 *
 * Utilizes Firebase Authentication to manage user sessions and Firestore to fetch user data
 * and associated orders. Provides functionality to cancel orders if they are still pending.
 *
 * - Redirects unauthenticated users to the login page.
 * - Fetches and displays user data and repair order history.
 * - Allows users to start a new repair or cancel existing orders.
 *
 * State:
 * - `user`: Current authenticated user.
 * - `loadingAuth`: Authentication loading state.
 * - `errorAuth`: Authentication error state.
 * - `userData`: Current user's data from Firestore.
 * - `orders`: List of user's orders.
 * - `loadingData`: Loading state for data fetching.
 * - `isCancellingId`: ID of the order currently being cancelled.
 *
 * Effects:
 * - Monitors authentication state changes to fetch user data and orders.
 * - Handles logout when no user is authenticated.
 *
 * Returns a JSX structure rendering the dashboard with user info, repair history, and action buttons.
 */

const Dashboard = () => {
    const [user, loadingAuth, errorAuth] = useAuthState(auth);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isCancellingId, setIsCancellingId] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!user && !loadingAuth) {
            console.log("No user logged in, logging out.");
            // logoutUser(); // Assuming this handles navigation
            // If logoutUser doesn't navigate, add: navigate('/login');
        }
    }, [user, loadingAuth, navigate]); // Added navigate to dependency array

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoadingData(true);
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setUserData(userDocSnap.data() as UserData);
                    } else {
                        console.warn("User document not found for UID:", user.uid);
                        setUserData(null);
                        // Optionally force logout or profile completion flow here
                    }

                    const ordersCollectionRef = collection(db, 'orders');
                    const q = query(ordersCollectionRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    const ordersList = querySnapshot.docs.map(d => {
                        const data = d.data();
                        // Ensure all nested objects exist with default values for safety
                        return {
                            id: d.id,
                            ...data,
                            contactInfo: data.contactInfo || {},
                            processing: data.processing || {},
                            payment: data.payment || {},
                        };
                    }) as Order[];
                    setOrders(ordersList);

                } catch (error) {
                    console.error("Error fetching user data or orders:", error);
                    toast.error("Failed to load your orders.");
                } finally {
                    setLoadingData(false);
                }
            } else {
                // Clear data if user logs out while component is mounted
                setUserData(null);
                setOrders([]);
                setLoadingData(false);
            }
        };

        // Fetch data only when user object changes or auth status changes after initial load
        if (user || !loadingAuth) {
            fetchData();
        }

    }, [user, loadingAuth, db]); // Added loadingAuth to dependency array

    const cancelOrder = async (orderId: string) => {
        const orderToCancel = orders.find(o => o.id === orderId);
        if (!orderToCancel) {
            toast.error("Order not found.");
            return;
        }

        // Allow cancelling if status is pending
        const canCancel = orderToCancel.processing?.status === 'pending';
        if (!canCancel) {
            toast.warning(`Cannot cancel order ${orderId.slice(0, 6).toUpperCase()}. It is already being processed.`);
            return;
        }

        if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            setIsCancellingId(orderId);
            try {
                // Option 1: Update status to 'cancelled' (Recommended for history)
                // Need serverTimestamp() from Firestore for this
                // import { serverTimestamp } from 'firebase/firestore';
                // await updateDoc(doc(db, 'orders', orderId), {
                //     'processing.status': 'cancelled' as OrderStatus,
                //     updatedAt: serverTimestamp() // Use server timestamp
                // });
                // // Optimistically update state
                // setOrders(orders.map(o => o.id === orderId ?
                //     { ...o, processing: { ...(o.processing as ProcessingInfo), status: 'cancelled' as OrderStatus }, updatedAt: new Date() } // Client date for immediate display
                //     : o
                // ));

                // Option 2: Delete the document (Your current implementation)
                await deleteDoc(doc(db, 'orders', orderId));
                setOrders(orders.filter(order => order.id !== orderId));


                toast.success(`Order ${orderId.slice(0, 6).toUpperCase()} cancelled successfully!`);
            } catch (error) {
                console.error("Error cancelling order:", error);
                toast.error("Error cancelling order. Try again later.");
            } finally {
                setIsCancellingId(null);
            }
        }
    };

    // Loading states
    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    if (errorAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600">
                Authentication Error: {errorAuth.message}
            </div>
        );
    }

    // If auth is loaded but no user
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center px-4">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p className="text-gray-700 mb-6">Please log in to view your dashboard.</p>
                <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
        );
    }

    // If user exists but data is still loading
    if (loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    // If user exists but no user data found (maybe redirect to profile creation?)
    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center px-4">
                <h1 className="text-2xl font-bold mb-4">Welcome New User!</h1>
                <p className="text-gray-700 mb-6">Please complete your profile to access your dashboard.</p>
                {/* Decide what to do if no user data - maybe force profile completion */}
                <Button onClick={() => logoutUser()} variant="outline">Logout</Button> {/* Or redirect to profile creation page */}
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4 bg-gray-50">
                <div className="container-custom">
                    <Card className="glass-card p-8 mb-8 shadow-xl border-electric-blue/50">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                            <h1 className="heading-lg text-electric-blue mb-4 sm:mb-0">Welcome, {userData.name || user.email || 'User'}</h1>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="p-4 bg-background shadow-sm">
                                <h2 className="heading-sm mb-4 text-gray-800 flex items-center gap-2">
                                    <User className="h-5 w-5 text-indigo-500" /> Your Information
                                </h2>
                                <div className="space-y-2 text-gray-700 text-sm">
                                    <p className='text-gray-700'><strong>Name:</strong> {userData.name || 'N/A'}</p>
                                    <p className='text-gray-700'><strong>Email:</strong> {userData.email || user.email || 'N/A'}</p>
                                </div>
                            </Card>

                            <Card className="p-4 bg-background shadow-sm flex flex-col justify-between">
                                <h2 className="heading-sm mb-4 text-gray-800 flex items-center gap-2">
                                    <Shirt className="h-5 w-5 text-lime-green" /> Start a New Repair
                                </h2>
                                <p className="text-gray-700 mb-4 text-sm flex-grow">
                                    Ready to get another jersey fixed? Start the repair process now.
                                </p>
                                <Link to="/upload-photos" className="w-full">
                                    <Button className="w-full btn-primary">Start New Repair</Button>
                                </Link>
                            </Card>
                        </div>
                    </Card>

                    <Card className="glass-card p-8 shadow-xl border-electric-blue/50">
                        <h2 className="heading-sm mb-6 text-gray-800 flex items-center gap-2">
                            <History className="h-5 w-5 text-orange-500" /> Your Repair History
                        </h2>
                        {orders.length === 0 ? (
                            <div className="bg-background rounded-lg p-8 text-center shadow-inner">
                                <p className="text-gray-700 mb-4">You don't have any repair history yet.</p>
                                <Link to="/upload-photos">
                                    <Button variant="outline">Start Your First Repair</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {orders.map((order) => {
                                    const paid = order.payment?.status === 'paid';
                                    const deliveryType = order.processing?.deliveryMethod;
                                    const formattedDate = order.createdAt && typeof order.createdAt === "object" && "seconds" in order.createdAt
                                        ? format(new Date((order.createdAt as Timestamp).seconds * 1000), "dd MMM yyyy HH:mm")
                                        : "N/A";
                                    const repairDescription = order.repairDescription || order.repairType || 'Repair Service';

                                    let statusBadge: React.ReactNode;
                                    if (order.processing?.status === 'cancelled') { // Show cancelled status explicitly
                                        statusBadge = <Badge key="cancelled" variant="outline" className="capitalize bg-red-100 text-red-600">Cancelled</Badge>;
                                    } else if (!paid) {
                                        statusBadge = <Badge key="payment" variant="destructive" className="capitalize">Pending Payment</Badge>;
                                    } else {
                                        // Use repairStatus for badge unless it's null, then fallback to general status
                                        statusBadge = <Badge key="processing" variant="default" className="capitalize">{order.processing?.repairStatus || order.processing?.status || 'Processing'}</Badge>;
                                    }


                                    return (
                                        <Dialog key={order.id}>
                                            <DialogTrigger asChild>
                                                <Card className="cursor-pointer transition hover:shadow-lg hover:border-electric-blue">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="flex items-center justify-between text-base font-semibold text-electric-blue">
                                                            <span>#{`KF${order.id.slice(0, 6).toUpperCase()}`}</span>
                                                            {statusBadge}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 text-sm text-gray-700">
                                                        <div className="flex items-center gap-2">
                                                            <Shirt className="h-4 w-4 text-blue-500" />
                                                            <span>{repairDescription}</span>
                                                        </div>
                                                        {deliveryType && (
                                                            <div className="flex items-center gap-2">
                                                                <Truck className="h-4 w-4 text-gray-600" />
                                                                <span className="capitalize">{deliveryType}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-orange-500" />
                                                            <span>Order Date: {formattedDate}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-lime-green" />
                                                            <span>Amount: R{order.price?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </DialogTrigger>

                                            {/* Dialog Content */}
                                            <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto max-h-[90vh] p-2 sm:p-4 md:p-8">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-bold text-electric-blue">
                                                        Order #{`KF${order.id.slice(0, 6).toUpperCase()}`}
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Repair and Delivery Details
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {/* Progress Stepper */}
                                                <div className="py-4 flex flex-col w-full">
                                                    <h3 className="text-lg font-semibold mb-4">Order Progress</h3>
                                                    {order.processing?.status !== 'cancelled' ? (
                                                        <div className="w-full overflow-x-auto">
                                                            <div className="min-w-[320px] sm:min-w-0">
                                                                <ProgressStepper
                                                                    steps={getProcessingSteps(order).steps}
                                                                    currentStep={getProcessingSteps(order).currentStep}
                                                                    direction="vertical"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-red-600 text-sm font-semibold text-center">This order has been cancelled.</p>
                                                    )}
                                                </div>

                                                {/* <Separator className="my-4" /> */}

                                                {/* Details */}
                                                <div className="space-y-4 text-gray-700 text-sm">
                                                    <h3 className="text-lg font-semibold mb-2">Details</h3>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Tag className="h-4 w-4 text-blue-500 shrink-0" />
                                                            <strong>Service:</strong> <span className="break-words">{repairDescription}</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-lime-green shrink-0" />
                                                            <strong>Amount:</strong> <span>R{order.price?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                        {order.processing?.deliveryMethod && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Truck className="h-4 w-4 text-gray-600 shrink-0" />
                                                                <strong>Method:</strong> <span className="capitalize">{order.processing.deliveryMethod}</span>
                                                            </div>
                                                        )}
                                                        {order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-orange-500 shrink-0" />
                                                                <strong>Order Placed:</strong> <span>{format(new Date(order.createdAt.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.preferredDate && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-purple-500 shrink-0" />
                                                                <strong>Preferred Date:</strong> <span>{order.processing.preferredDate}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualCustomerDropoffDate?.seconds && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Dropoff:</strong> <span>{format(new Date(order.processing.actualCustomerDropoffDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualInitialPickupDate?.seconds && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Picked Up:</strong> <span>{format(new Date(order.processing?.actualInitialPickupDate?.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualCustomerPickupDate && typeof order.processing.actualCustomerPickupDate === 'object' && 'seconds' in order.processing.actualCustomerPickupDate && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Picked Up by Customer:</strong> <span>{format(new Date(order.processing.actualCustomerPickupDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualKitFixDeliveryDate && typeof order.processing.actualKitFixDeliveryDate === 'object' && 'seconds' in order.processing.actualKitFixDeliveryDate && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Delivered:</strong> <span>{format(new Date(order.processing.actualKitFixDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}

                                                        {/* Locations */}
                                                        {order.processing?.deliveryMethod === 'delivery' && order.contactInfo?.address && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Delivery Address:</strong> <span className="break-words">{order.contactInfo.address}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.customerDropoffLocation && order.processing?.deliveryMethod === 'dropoff' && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Dropoff Location:</strong> <span className="break-words">{order.processing.customerDropoffLocation}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.customerPickupLocation && (order.processing?.deliveryMethod === 'dropoff' || order.processing?.fulfillmentMethod === 'pickup') && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Customer Pickup Location:</strong> <span className="break-words">{order.processing.customerPickupLocation}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.initialPickupLocation && order.processing?.deliveryMethod === 'pickup' && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>KitFix Pickup Location:</strong> <span className="break-words">{order.processing.initialPickupLocation}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.kitFixDeliveryAddress && (order.processing?.deliveryMethod === 'pickup' || order.processing?.fulfillmentMethod === 'delivery') && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>KitFix Delivery Address:</strong> <span className="break-words">{order.processing.kitFixDeliveryAddress}</span>
                                                            </div>
                                                        )}

                                                        {/* Notes */}
                                                        {order.notes && (
                                                            <div className="flex flex-wrap items-start gap-2">
                                                                <Package className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                                                <strong>Notes:</strong> <span className="break-words">{order.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* <Separator className="my-4" /> */}

                                                    {/* Contact Info */}
                                                    {order.contactInfo && (
                                                        <div className="text-gray-700 text-sm">
                                                            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <User className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.name || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.email || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.phone || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    {order.payment?.status === 'unpaid' && order.processing?.status !== 'cancelled' && order.processing?.status !== 'completed' && order.processing?.status !== 'fulfilled' && (
                                                        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                                                            {order.stepCompleted === 'schedule' ? (
                                                                <Link to={`/payment?orderId=${order.id}`} className="w-full">
                                                                    <Button className="w-full">Continue to Payment</Button>
                                                                </Link>
                                                            ) : (
                                                                <Link to={`/get-quote?orderId=${order.id}`} className="w-full">
                                                                    <Button className="w-full btn-primary">Continue Repair</Button>
                                                                </Link>
                                                            )}
                                                            {order.processing?.status === 'pending' && (
                                                                <Button
                                                                    variant="destructive"
                                                                    className="w-full sm:w-auto"
                                                                    onClick={() => cancelOrder(order.id)}
                                                                    disabled={isCancellingId === order.id}
                                                                >
                                                                    {isCancellingId === order.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                    Cancel Order
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {order.processing?.status === 'cancelled' && (
                                                        <div className="pt-4 text-center text-red-600 font-semibold">
                                                            This order has been cancelled.
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Dashboard;