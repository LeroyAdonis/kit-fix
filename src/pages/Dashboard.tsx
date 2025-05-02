/* eslint-disable @typescript-eslint/no-unused-vars */
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
    User, // Added icons
    Mail,
    Phone,
    Tag,
    Package,
    DollarSign,
    MapPin,
    Loader2 // Loading spinner for buttons
} from 'lucide-react';
import ProgressStepper from '@/components/ProgressStepper'; // Assuming this component can take steps array and current step index

// Import types
import { Order } from '@/types/order';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Define a UserData interface based on what you save in 'users' collection
interface UserData {
    name: string;
    email: string;
    // Add other user fields if you save them
}


// Helper function to map internal status to customer-friendly steps and current index
const getProcessingSteps = (order: Order): { steps: string[], currentStep: number } => { // Expect Order, not Order | null here
    if (!order || !order.processing) { // Added null check for safety, although type hint suggests order should exist
        // This fallback case is less ideal, should ensure order.processing exists before calling
        console.warn("getProcessingSteps called with incomplete order:", order);
        return { steps: ['Order Placed', 'Processing', 'Completed'], currentStep: 0 };
    }

    const { deliveryMethod = 'unknown', repairStatus } = order.processing as { deliveryMethod?: string; repairStatus: string };

    const steps: string[] = [];
    let currentStep = 0;

    // Base steps applicable to all orders
    steps.push('Order Placed'); // Status: pending, RepairStatus: Pending Routing

    if (deliveryMethod === 'dropoff') {
        steps.push('Awaiting Dropoff'); // RepairStatus: Routed to Dropoff, DropoffStatus: awaiting_dropoff
        steps.push('Item Dropped Off'); // DropoffStatus: dropped_off, RepairStatus: Ready for Repair (from Dropoff)
        steps.push('In Repair');      // RepairStatus: Assigned, In Repair
        steps.push('Ready for Pickup'); // RepairStatus: Repair Completed, Ready for Pickup
        steps.push('Picked Up');      // ActualPickupDate set, or PickupStatus: picked
    } else if (deliveryMethod === 'pickup') {
        steps.push('Awaiting Pickup'); // RepairStatus: Sent to Repair Manager, PickupStatus: awaiting_pickup
        steps.push('Item Picked Up'); // ActualPickupDate set, or PickupStatus: picked
        steps.push('In Repair');      // RepairStatus: Assigned, In Repair
        steps.push('Ready for Delivery'); // RepairStatus: Repair Completed, Ready for Delivery
        steps.push('Delivered');      // ActualDeliveryDate set, or DeliveryStatus: delivered
    } else if (deliveryMethod === 'delivery') {
        steps.push('Awaiting Delivery'); // RepairStatus: Sent to Repair Manager, DeliveryStatus: awaiting_delivery
        // Option: Add a step for item received at KitFix if this isn't implicit
        steps.push('In Repair');      // RepairStatus: Assigned, In Repair
        steps.push('Ready for Delivery'); // RepairStatus: Repair Completed, Ready for Delivery
        steps.push('Out for Delivery'); // DeliveryStatus: out_for_delivery
        steps.push('Delivered');      // ActualDeliveryDate set, or DeliveryStatus: delivered
    } else {
        // Default flow for unspecified/standard mail-in
        steps.push('Item Received'); // RepairStatus: Sent to Repair Manager (assuming mail-in)
        steps.push('In Repair');
        steps.push('Completed'); // Final step might just be 'Completed' if no return method tracked here
    }


    // Determine current step based on repairStatus primarily, maybe cross-reference method-specific statuses
    switch (repairStatus) {
        case 'Pending Routing':
            currentStep = 0;
            break;
        case 'Routed to Dropoff':
            currentStep = steps.indexOf('Awaiting Dropoff'); // Find index dynamically
            if (currentStep === -1) currentStep = 1; // Fallback
            break;
        case 'Ready for Repair (from Dropoff)':
            currentStep = steps.indexOf('Item Dropped Off'); // Find index
            if (currentStep === -1) currentStep = 2; // Fallback
            break;
        case 'Sent to Repair Manager':
            currentStep = steps.indexOf('Awaiting Pickup') !== -1 ? steps.indexOf('Awaiting Pickup') : (steps.indexOf('Awaiting Delivery') !== -1 ? steps.indexOf('Awaiting Delivery') : steps.indexOf('Item Received'));
            if (currentStep === -1) currentStep = 1; // Fallback
            break;
        case 'Assigned':
        case 'In Repair':
            currentStep = steps.indexOf('In Repair');
            if (currentStep === -1) currentStep = 2; // Fallback
            break;
        case 'Repair Completed':
            // Step depends on return method
            if (deliveryMethod === 'pickup') {
                currentStep = steps.indexOf('Ready for Pickup');
                if (currentStep === -1) currentStep = steps.indexOf('In Repair') + 1; // Fallback
            } else if (deliveryMethod === 'delivery') {
                currentStep = steps.indexOf('Ready for Delivery');
                if (currentStep === -1) currentStep = steps.indexOf('In Repair') + 1; // Fallback
            } else {
                // Default/Dropoff flow reaching end
                currentStep = steps.length - 1; // Assume last step if no specific return method status
            }
            if (currentStep === -1) currentStep = 3; // Final fallback
            break;
        case 'Ready for Pickup':
            currentStep = steps.indexOf('Ready for Pickup');
            if (currentStep === -1) currentStep = 3; // Fallback
            break;
        case 'Ready for Delivery':
            currentStep = steps.indexOf('Ready for Delivery');
            if (currentStep === -1) currentStep = 3; // Fallback
            break;
        case 'Out for Delivery':
            currentStep = steps.indexOf('Out for Delivery');
            if (currentStep === -1) currentStep = steps.indexOf('Ready for Delivery') + 1; // Fallback
            break;

        // Add final status checks (Picked Up, Delivered, Completed)
        // Check actual timestamps or final specific statuses if they exist
        default:
            // If repairStatus doesn't match a known step, try checking final states
            if (order.processing.actualPickupDate || order.processing.pickupStatus === 'picked') {
                currentStep = steps.indexOf('Picked Up');
                if (currentStep === -1) currentStep = steps.length - 1; // Fallback to last step
            } else if (order.processing.actualDeliveryDate || order.processing.deliveryStatus === 'delivered') {
                currentStep = steps.indexOf('Delivered');
                if (currentStep === -1) currentStep = steps.length - 1; // Fallback to last step
            } else if (order.processing.actualDropoffDate || order.processing.dropoffStatus === 'dropped_off') {
                currentStep = steps.indexOf('Item Dropped Off'); // Dropped off is a middle step
                if (currentStep === -1) currentStep = 2; // Fallback
            } else if (order.processing.status === 'completed') {
                currentStep = steps.length - 1; // Assume last step if processing.status is completed
            }
            // If none match, keep initial 0 or a fallback
            if (currentStep === 0 && repairStatus !== 'Pending Routing') {
                // If status is not pending routing but we couldn't map it, default to step 1 or 2?
                // This indicates missing mapping logic.
                // For robustness, maybe set to 1 or 2 as a visual indicator of *some* progress.
                currentStep = 1; // Assume at least 'Item Received' or similar
                console.warn("Could not map repairStatus to step:", repairStatus, order.id);
            }
            break;
    }

    // Ensure currentStep is within bounds [0, steps.length - 1]
    currentStep = Math.max(0, Math.min(currentStep, steps.length - 1));

    return { steps, currentStep };
};


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
            logoutUser();
        }
    }, [user, loadingAuth, navigate]);

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
                    }

                    const ordersCollectionRef = collection(db, 'orders');
                    const q = query(ordersCollectionRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    const ordersList = querySnapshot.docs.map(d => {
                        const data = d.data();
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
                setUserData(null);
                setOrders([]);
                setLoadingData(false);
            }
        };

        if (user) {
            fetchData();
        } else if (!loadingAuth) {
            setUserData(null);
            setOrders([]);
            setLoadingData(false);
        }


    }, [user, db]);


    const cancelOrder = async (orderId: string) => {
        const orderToCancel = orders.find(o => o.id === orderId);
        if (!orderToCancel) {
            toast.error("Order not found.");
            return;
        }

        const canCancel = orderToCancel.processing?.status === 'pending';
        if (!canCancel) {
            toast.warning(`Cannot cancel order ${orderId.slice(0, 6).toUpperCase()}. It is already being processed.`);
            return;
        }

        if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            setIsCancellingId(orderId);
            try {
                // Optionally update status to 'cancelled' instead of deleting for history
                // await updateDoc(doc(db, 'orders', orderId), { processing: { ...orderToCancel.processing, status: 'cancelled' as OrderStatus }, updatedAt: serverTimestamp() });
                // setOrders(orders.map(o => o.id === orderId ? { ...o, processing: { ...o.processing, status: 'cancelled' } as Order } : o)); // Optimistic update

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

    if (loadingAuth || (user && loadingData) || (!user && loadingData)) {
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

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center px-4">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p className="text-gray-700 mb-6">Please log in to view your dashboard.</p>
                <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center px-4">
                <h1 className="text-2xl font-bold mb-4">Welcome New User!</h1>
                <p className="text-gray-700 mb-6">Please complete your profile to access your dashboard.</p>
                <Button onClick={() => logoutUser()} variant="outline">Logout</Button>
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
                                        statusBadge = <Badge key="processing" variant="default" className="capitalize">{order.processing?.repairStatus || 'Processing'}</Badge>;
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
                                            {/* Added w-full for mobile, adjusted padding and max-w */}
                                            <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto max-h-[90vh] p-4 sm:p-6 md:p-8">

                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-bold text-electric-blue">
                                                        Order #{`KF${order.id.slice(0, 6).toUpperCase()}`}
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Repair and Delivery Details
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {/* Progress Stepper */}
                                                <div className="py-4 flex flex-col space-between">
                                                    <h3 className="text-lg font-semibold mb-4">Order Progress</h3>
                                                    {order.processing ? (
                                                        <ProgressStepper
                                                            steps={getProcessingSteps(order).steps}
                                                            currentStep={getProcessingSteps(order).currentStep}
                                                        />
                                                    ) : (
                                                        <p className="text-gray-600 text-sm">Progress information not available.</p>
                                                    )}

                                                </div>


                                                {/* <Separator className="my-4" /> */}

                                                {/* Detailed Order Info */}
                                                {/* Changed grid to md:grid-cols-2 */}
                                                <div className="space-y-4 text-gray-700 text-sm">
                                                    <h3 className="text-lg font-semibold mb-2">Details</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                                        {/* Added break-words to spans with potentially long values */}
                                                        <div className="flex items-center gap-2">
                                                            <Tag className="h-4 w-4 text-blue-500 shrink-0" /> {/* shrink-0 prevents icon shrinking */}
                                                            <strong>Service:</strong> <span className="break-words">{repairDescription}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-lime-green shrink-0" />
                                                            <strong>Amount:</strong> <span>R{order.price?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                        {order.processing?.deliveryMethod && (
                                                            <div className="flex items-center gap-2">
                                                                <Truck className="h-4 w-4 text-gray-600 shrink-0" />
                                                                <strong>Method:</strong> <span className="capitalize">{order.processing.deliveryMethod}</span>
                                                            </div>
                                                        )}

                                                        {order.processing?.preferredDate && (
                                                            <div className="flex items-center gap-2">
                                                                <CalendarDays className="h-4 w-4 text-purple-500 shrink-0" />
                                                                <strong>Preferred Date:</strong> <span>{order.processing.preferredDate}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.scheduledDropoffDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Scheduled Dropoff:</strong> <span>{format(new Date(order.processing.scheduledDropoffDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualDropoffDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Dropoff:</strong> <span>{format(new Date(order.processing.actualDropoffDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.scheduledPickupDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Scheduled Pickup:</strong> <span>{format(new Date(order.processing.scheduledPickupDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualPickupDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Pickup:</strong> <span>{format(new Date(order.processing.actualPickupDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.scheduledDeliveryDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Scheduled Delivery:</strong> <span>{format(new Date(order.processing.scheduledDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.actualDeliveryDate?.seconds && (
                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                                                <strong>Actual Delivery:</strong> <span>{format(new Date(order.processing.actualDeliveryDate.seconds * 1000), 'dd MMM yyyy HH:mm')}</span>
                                                            </div>
                                                        )}


                                                        {/* Display relevant location */}
                                                        {order.processing?.deliveryMethod === 'delivery' && order.contactInfo?.address && (
                                                            <div className="flex items-start gap-2 md:col-span-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Delivery Address:</strong> <span className="break-words">{order.contactInfo.address}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.dropoffLocation && order.processing?.deliveryMethod === 'dropoff' && (
                                                            <div className="flex items-start gap-2 md:col-span-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Dropoff Location:</strong> <span className="break-words">{order.processing.dropoffLocation}</span>
                                                            </div>
                                                        )}
                                                        {order.processing?.pickupLocation && order.processing?.deliveryMethod === 'pickup' && (
                                                            <div className="flex items-start gap-2 md:col-span-2">
                                                                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                                                                <strong>Pickup Location:</strong> <span className="break-words">{order.processing.pickupLocation}</span>
                                                            </div>
                                                        )}


                                                        {/* Display Notes */}
                                                        {order.notes && (
                                                            <div className="flex items-start gap-2 md:col-span-2">
                                                                <Package className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                                                <strong>Notes:</strong> <span className="break-words">{order.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Image Carousel (using order.photos) */}
                                                    {/* {order.photos && order.photos.length > 0 && (
                                                        <div className="py-4">
                                                            <h3 className="text-lg font-semibold mb-4">Uploaded Photos</h3>
                                                            <OrderImageCarousel images={order.photos} /> {/* Pass order.photos 
                                                        </div>
                                                    )}*/}

                                                    <Separator className="my-4" />

                                                    {/* Contact Info in Dialog */}
                                                    {order.contactInfo && (
                                                        <div className=" text-gray-700 text-sm">
                                                            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.name || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.email || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                                                                    <span>{order.contactInfo?.phone || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}


                                                    {/* Action Buttons */}
                                                    {/* Only show 'Continue Repair' if not paid and not cancelled/completed */}
                                                    {order.payment?.status === 'unpaid' && order.processing?.status !== 'cancelled' && order.processing?.status !== 'completed' && (
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

                                                            {/* Cancel button */}
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

                                                    {/* Message if order is cancelled */}
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