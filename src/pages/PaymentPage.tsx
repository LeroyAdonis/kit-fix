/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { updateDoc, Timestamp, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { toast } from 'sonner'; // Use sonner

import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Import types - Ensure all types are imported
import { Order, PaymentStatus } from '@/types/order';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage
} from '@/components/ui/form';

const loginSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' })
});

function EmbeddedLoginForm({ onSuccess }: { onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });
    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');
        try {
            await loginUser(data.email, data.password);
            onSuccess();
        } catch (err: any) {
            let errorMessage = 'Login failed. Please try again.';
            if (err.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid credentials. Please check your email and password.';
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                <FormField control={form.control} name="email" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </Button>
            </form>
        </Form>
    );
}

const registerSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

function EmbeddedRegisterForm({ onSuccess }: { onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const form = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    });
    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: data.name });
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: data.name,
                email: data.email,
                phone: '',
                orderHistory: [],
                paymentStatus: '',
                deliveryAddress: '',
                jerseyImages: [],
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                <FormField control={form.control} name="name" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }: { field: any }) => (
                    <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Register'}
                </Button>
            </form>
        </Form>
    );
}

const PaymentPage = () => {
    const publicKey = 'pk_test_47613641c497d46502f6efadf29ef3c821f7b459'; // Use environment variables!

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [user] = useAuthState(auth);
    const [isLoading, setIsLoading] = useState(false); // Loading for Paystack initiation/payment process
    const [showAuthModal, setShowAuthModal] = useState(false); // Modal state
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login'); // Tab state
    const paymentPendingRef = useRef(false); // Track if payment should be triggered after login

    // State to hold the consolidated order data for display and payment
    // This state should ideally mirror the Firestore document structure as much as possible
    const [finalOrderData, setFinalOrderData] = useState<Order | null>(null);
    const [finalOrderId, setFinalOrderId] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true); // Loading for initial data fetch
    const [, setIsCancellingId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);

    // Effect to fetch and consolidate order data for display
    useEffect(() => {
        const loadOrderData = async () => {
            setPageLoading(true);
            const orderIdFromParams = searchParams.get("orderId");

            if (!orderIdFromParams) {
                toast.error("Order ID missing from URL.");
                navigate("/dashboard"); // Redirect if no order ID
                setPageLoading(false);
                return;
            }

            setFinalOrderId(orderIdFromParams); // Set the order ID state

            try {
                const orderRef = doc(db, "orders", orderIdFromParams);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const orderData = orderSnap.data() as Order; // Cast fetched data
                    setFinalOrderData(orderData); // Set the state with fetched data

                    // If order is already paid, redirect to confirmation
                    if (orderData.payment?.status === 'paid') {
                        toast.info("Order already paid.");
                        navigate(`/confirmation/${orderIdFromParams}`);
                        setPageLoading(false); // Stop loading before redirect
                        return; // Stop further execution
                    }

                    // Check if required data from previous steps is present
                    // Check for essential fields set in Quote and Schedule steps
                    if (!orderData.repairType || !orderData.price || !orderData.contactInfo?.name || !orderData.processing?.initialMethod || !orderData.processing?.fulfillmentMethod) {
                        console.warn("Fetched order is missing essential details for payment:", orderData);
                        toast.warning("Missing order details. Please revisit previous steps.");
                        // Redirect to the earliest step likely missing data (ScheduleService)
                        // If ScheduleService is the step that saves methods, redirect there.
                        navigate(`/schedule-service?orderId=${orderIdFromParams}`);
                        setPageLoading(false); // Stop loading before redirect
                        return; // Stop further execution
                    }

                } else {
                    // Order ID from params not found in DB - This indicates a problem in previous steps
                    console.error("Order ID not found in database:", orderIdFromParams);
                    toast.error("Order not found. Please restart the repair process.");
                    navigate("/dashboard"); // Redirect to a safe page
                }
            } catch (error) {
                console.error("Error fetching order data for payment:", error);
                toast.error("Failed to load order data. Please try again.");
            } finally {
                setPageLoading(false); // Stop page loading
            }
        };

        loadOrderData();
        // Add dependencies: searchParams, navigate
        // Depend on db as well, though unlikely to change
    }, [searchParams, navigate, db]);

    // Effect: If modal is open and user logs in, close modal and trigger payment
    useEffect(() => {
        if (showAuthModal && user) {
            setShowAuthModal(false);
            if (!paymentPendingRef.current) {
                paymentPendingRef.current = true;
                setTimeout(() => {
                    handlePaystack();
                    paymentPendingRef.current = false;
                }, 300);
            }
        }
    }, [showAuthModal, user]);

    const cancelOrder = async (orderId: string | null) => {
        const orderIdFromParams = searchParams.get("orderId");
        if (!finalOrderData) {
            toast.error("Order not found.");
            return;
        }

        // Allow cancelling if status is pending
        const canCancel = finalOrderData.processing?.status === 'pending';
        if (!canCancel) {
            if (orderIdFromParams) {
                toast.warning(`Cannot cancel order ${orderIdFromParams.slice(0, 6).toUpperCase()}. It is already being processed.`);
            } else {
                toast.warning("Cannot cancel order. Order ID is missing.");
            }
            return;
        }

        if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            setIsCancellingId(orderIdFromParams);
            try {
                if (orderId) {
                    await deleteDoc(doc(db, 'orders', orderId));
                } else {
                    console.error("Order ID is null. Cannot delete the document.");
                    toast.error("Failed to cancel the order. Order ID is missing.");
                }
                setOrders(orders.filter(order => order.id !== orderId));

                if (orderId) {
                    toast.success(`Order ${orderId.slice(0, 6).toUpperCase()} cancelled successfully!`);
                    navigate("/dashboard");
                } else {
                    toast.error("Order ID is missing. Cannot display cancellation message.");
                }
            } catch (error) {
                console.error("Error cancelling order:", error);
                toast.error("Error cancelling order. Try again later.");
            } finally {
                setIsCancellingId(null);
            }
        }
    };

    const handlePaymentSuccess = async (reference: string) => {
        if (!user) {
            toast.error("User not authenticated.");
            return;
        }
        if (!finalOrderId) {
            toast.error("Order ID missing after payment.");
            return;
        }

        if (!finalOrderData) {
            toast.error("Order data missing for payment success update.");
            navigate("/dashboard");
            return;
        }

        try {
            const orderRef = doc(db, "orders", finalOrderId);

            const updates: Partial<Order> = {
                payment: {
                    ...(finalOrderData.payment || {}),
                    amount: finalOrderData.price,
                    reference: reference,
                    status: "paid" as PaymentStatus,
                    method: "Paystack",
                    paidAt: Timestamp.now(),
                },
                updatedAt: serverTimestamp(),
            };

            await updateDoc(orderRef, updates);

            toast.success("Payment successful!", { description: "Your order has been placed." });

            localStorage.removeItem('kitfix-order');
            localStorage.removeItem('orderId');
            localStorage.removeItem('kitfix-quote-photos');
            localStorage.removeItem('kitfix-quote-repairType');
            localStorage.removeItem('kitfix-quote-notes');
            localStorage.removeItem('kitfix-schedule-data');

            navigate(`/confirmation/${finalOrderId}`);

        } catch (error) {
            console.error("Error saving order after payment:", error);
            toast.error("Something went wrong", { description: "We couldn't update your order status after payment." });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaystack = async () => {
        if (!user) {
            setShowAuthModal(true); // Show login/register modal
            return;
        }
        if (!finalOrderData || !finalOrderId) {
            toast.error("Order data is missing. Please refresh the page.");
            return;
        }
        if (finalOrderData.payment?.status === 'paid') {
            toast.info("This order is already paid.");
            navigate(`/confirmation/${finalOrderId}`);
            return;
        }
        if (!finalOrderData.price || finalOrderData.price <= 0) {
            toast.error("Cannot process payment for invalid amount.");
            console.error("Invalid order price:", finalOrderData.price);
            return;
        }
        if (!finalOrderData.processing?.initialMethod || !finalOrderData.processing?.fulfillmentMethod) {
            toast.error("Order is missing initial or fulfillment method. Please go back to scheduling.");
            navigate(`/schedule-service?orderId=${finalOrderId}`);
            return;
        }

        setIsLoading(true);

        try {
            const orderId = finalOrderId;
            const orderRef = doc(db, "orders", orderId);

            const existingSnap = await getDoc(orderRef);
            const existingData = existingSnap.exists() ? existingSnap.data() as Order : null;

            if (!existingData) {
                toast.error("Critical error: Order not found before payment initiation.");
                setIsLoading(false);
                navigate("/dashboard");
                return;
            }

            const updates: Partial<Order> = {
                payment: {
                    ...(existingData.payment || {}),
                    amount: existingData.price,
                    status: "unpaid" as PaymentStatus,
                },
                stepCompleted: 'payment_initiated',
                updatedAt: serverTimestamp(),
            };

            await updateDoc(orderRef, updates);

            const paystack = (window as any).PaystackPop.setup({
                key: publicKey,
                email: existingData.contactInfo?.email || existingData.userId,
                amount: (existingData.price || 0) * 100,
                currency: "ZAR",
                metadata: {
                    orderId: orderId,
                    name: existingData.contactInfo?.name,
                    phone: existingData.contactInfo?.phone,
                    email: existingData.contactInfo?.email,
                    initialMethod: existingData.processing?.initialMethod,
                    fulfillmentMethod: existingData.processing?.fulfillmentMethod,
                    repairType: existingData.repairType,
                    price: existingData.price,
                    customerAddress: existingData.contactInfo?.address,
                    dropoffLocation: existingData.processing?.customerDropoffLocation,
                    initialPickupLocation: existingData.processing?.initialPickupLocation,
                    customerPickupLocation: existingData.processing?.customerPickupLocation,
                    kitFixDeliveryAddress: existingData.processing?.kitFixDeliveryAddress,
                },
                callback: (response: any) => {
                    console.log("Paystack callback received:", response);
                    handlePaymentSuccess(response.reference);
                },
                onClose: () => {
                    toast.info("Payment cancelled", { description: "You closed the payment window." });
                    setIsLoading(false);
                },
            });

            paystack.openIframe();

        } catch (error) {
            console.error("Error initiating payment or updating order status to unpaid:", error);
            toast.error("Payment Failed", { description: "Could not initiate payment. Please check console." });
            setIsLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    if (!finalOrderData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Could not load order data. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4">
                <div className="container mx-auto max-w-3xl">
                    <Card className="shadow-xl">
                        <CardHeader>
                            <h1 className="text-3xl font-bold text-electric-blue">Confirm & Pay</h1>
                            <p className="text-muted-foreground text-gray-600">Review your details before proceeding to payment.</p>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 gap-4 text-gray-700">
                                <div>
                                    <strong>Order #:</strong> {finalOrderId ? finalOrderId.slice(0, 6).toUpperCase() : 'N/A'}
                                </div>
                                <div>
                                    <strong>Name:</strong> {finalOrderData.contactInfo?.name || 'N/A'}
                                </div>
                                <div>
                                    <strong>Email:</strong> {finalOrderData.contactInfo?.email || 'N/A'}
                                </div>
                                <div>
                                    <strong>Phone:</strong> {finalOrderData.contactInfo?.phone || 'N/A'}
                                </div>
                                {finalOrderData.contactInfo?.address && (
                                    <div>
                                        <strong>Address:</strong> {finalOrderData.contactInfo.address}
                                    </div>
                                )}
                                <div>
                                    <strong>Repair Type:</strong> {finalOrderData.repairDescription || finalOrderData.repairType || 'N/A'}
                                </div>
                                <div>
                                    <strong>Processing Time:</strong> {finalOrderData.processing?.duration || 'N/A'}
                                </div>
                                {finalOrderData.notes && (
                                    <div>
                                        <strong>Additional Notes:</strong> {finalOrderData.notes}
                                    </div>
                                )}
                                {finalOrderData.processing?.initialMethod && (
                                    <div>
                                        <strong>Initial Method:</strong>{" "}
                                        {finalOrderData.processing.initialMethod.charAt(0).toUpperCase() + finalOrderData.processing.initialMethod.slice(1)}
                                    </div>
                                )}
                                {finalOrderData.processing?.fulfillmentMethod && (
                                    <div>
                                        <strong>Return Method:</strong>{" "}
                                        {finalOrderData.processing.fulfillmentMethod.charAt(0).toUpperCase() + finalOrderData.processing.fulfillmentMethod.slice(1)}
                                    </div>
                                )}
                                {finalOrderData.processing?.preferredDate && (
                                    <div>
                                        <strong>Preferred Date:</strong> {finalOrderData.processing.preferredDate}
                                    </div>
                                )}
                            </div>
                            <Separator className="my-4" />
                            <div className="flex justify-between items-center font-bold text-xl">
                                <span>Total Amount:</span>
                                <span className="text-electric-blue">R{finalOrderData.price?.toFixed(2) || '0.00'}</span>
                            </div>
                            <Button className="w-full mt-6" onClick={handlePaystack} disabled={isLoading || pageLoading}>
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Pay Now (R{finalOrderData.price?.toFixed(2) || '0.00'})
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => navigate(`/schedule-service?orderId=${finalOrderId}`, { state: { fromPayment: true } })}
                                disabled={isLoading || pageLoading}
                            >
                                Back to Schedule
                            </Button>
                            {finalOrderData?.processing?.status === 'pending' && (
                                <Button className="w-full" variant="outline" onClick={() => cancelOrder(finalOrderId!)} disabled={isLoading || pageLoading}>
                                    Cancel
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
                {/* Login/Register Modal */}
                {showAuthModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
                            <button
                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowAuthModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                            <div className="flex justify-center mb-6">
                                <button
                                    className={`px-4 py-2 font-semibold rounded-l ${authTab === 'login' ? 'bg-electric-blue text-white' : 'bg-gray-100 text-gray-700'}`}
                                    onClick={() => setAuthTab('login')}
                                >
                                    Login
                                </button>
                                <button
                                    className={`px-4 py-2 font-semibold rounded-r ${authTab === 'register' ? 'bg-electric-blue text-white' : 'bg-gray-100 text-gray-700'}`}
                                    onClick={() => setAuthTab('register')}
                                >
                                    Register
                                </button>
                            </div>
                            <div>
                                {authTab === 'login' ? (
                                    <EmbeddedLoginForm onSuccess={() => setShowAuthModal(false)} />
                                ) : (
                                    <EmbeddedRegisterForm onSuccess={() => setShowAuthModal(false)} />
                                )}
                                <div className="mt-4 text-center text-gray-500 text-sm">
                                    After logging in or registering, your payment will continue automatically.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default PaymentPage;