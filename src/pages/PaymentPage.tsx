import { setDoc, collection, updateDoc, doc, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore'; // Import serverTimestamp and getDoc
import { auth, db } from '@/firebaseConfig';
// Use sonner toast - Remove shadcn useToast
// import { useToast } from "@/hooks/use-toast"; // REMOVE THIS
import { toast } from 'sonner'; // Use sonner

// Remove Shadcn form components if not actually using them for validation/state management here
// import { Form, FormItem, FormLabel, FormControl } from "@/components/ui/form"; // REMOVE IF NOT USED
// import { FormProvider, useForm } from 'react-hook-form'; // REMOVE IF NOT USED

import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Import types
import { Order, OrderStatus, PaymentStatus, RepairStatus, DeliveryMethod, PickupStatus, DropoffStatus, DeliveryStatus, ContactInfo, ProcessingInfo, PaymentInfo } from '@/types/order';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';


const PaymentPage = () => {
    // Replace useToast with sonner toast
    // const { toast } = useToast(); // REMOVE THIS LINE

    const publicKey = 'pk_test_47613641c497d46502f6efadf29ef3c821f7b459'; // Use environment variables!

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Remove react-hook-form specific state/hooks if not actively used for the payment form fields
    // const methods = useForm(); // REMOVE THIS
    // const { setValue } = methods; // REMOVE THIS

    const [user] = useAuthState(auth);
    const [isLoading, setIsLoading] = useState(false); // Loading for Paystack initiation/payment process

    // State to hold the consolidated order data for display and payment
    const [finalOrderData, setFinalOrderData] = useState<Order | null>(null);
    const [finalOrderId, setFinalOrderId] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true); // Loading for initial data fetch


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
                    setFinalOrderData(orderData);

                    // If order is already paid, redirect to confirmation
                    if (orderData.payment?.status === 'paid') {
                        toast.info("Order already paid.");
                        navigate(`/confirmation/${orderIdFromParams}`);
                        setPageLoading(false); // Stop loading before redirect
                        return; // Stop further execution
                    }

                    // Check if required data from previous steps is present (optional but good)
                    if (!orderData.repairType || !orderData.price || !orderData.contactInfo || !orderData.processing?.deliveryMethod) {
                        toast.warning("Missing order details. Please revisit previous steps.");
                        // Decide where to redirect - maybe schedule-service?
                        navigate(`/schedule-service?orderId=${orderIdFromParams}`);
                        setPageLoading(false); // Stop loading before redirect
                        return; // Stop further execution
                    }

                } else {
                    // Order ID from params not found in DB
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
        // Add searchParams and navigate to dependency array
    }, [searchParams, navigate]);


    // Function called by Paystack on successful payment
    const handlePaymentSuccess = async (reference: string) => {
        // setIsLoading(true); // Loading is already true from handlePaystack

        if (!user) {
            toast.error("User not authenticated."); // Use sonner toast
            // setIsLoading(false); // Ensure loading is off
            return; // Exit early
        }
        if (!finalOrderId) {
            toast.error("Order ID missing after payment."); // Use sonner toast
            // setIsLoading(false); // Ensure loading is off
            return; // Exit early
        }

        try {
            const orderRef = doc(db, "orders", finalOrderId);

            // Update the order document with payment details
            const updates: Partial<Order> = {
                payment: {
                    // Assuming payment object exists from initial creation
                    amount: finalOrderData?.price || 0, // Use the correct price
                    reference: reference,
                    status: "paid" as PaymentStatus,
                    method: "Paystack", // Or get dynamically
                    paidAt: Timestamp.now(),
                },
                // DO NOT update processing.status or repairStatus here - they are for admin workflow
                // You might update a customer-facing status field if you have one separate from processing.status
                // e.g., customerFacingStatus: "paid"

                updatedAt: serverTimestamp(), // Always update timestamp
            };

            await updateDoc(orderRef, updates);


            toast.success("Payment successful!", { description: "Your order has been placed." }); // Use sonner toast

            // Clean up localStorage items related to the order process flow on successful payment
            localStorage.removeItem('kitfix-order');
            localStorage.removeItem('orderId'); // Assuming this stores finalOrderId
            localStorage.removeItem('kitfix-quote-photos');
            localStorage.removeItem('kitfix-quote-repairType');
            localStorage.removeItem('kitfix-quote-notes');
            localStorage.removeItem('kitfix-schedule-data');


            navigate(`/confirmation/${finalOrderId}`); // Navigate to confirmation page

        } catch (error) {
            console.error("Error saving order after payment:", error);
            toast.error("Something went wrong", { description: "We couldn't update your order status after payment." }); // Use sonner toast
            // Important: If the database update fails but payment succeeded, you have a discrepancy!
            // You need a way to reconcile this (e.g., webhook from Paystack, manual check, retry mechanism).
            // For now, log the error and show a user message.
        } finally {
            setIsLoading(false); // Ensure loading is off after DB update attempt
        }
    };

    // Function to initiate Paystack payment
    const handlePaystack = async () => {
        if (!user) {
            toast.error("You must be logged in to pay."); // Use sonner toast
            return;
        }
        // Ensure we have final order data for price, email, etc.
        if (!finalOrderData || !finalOrderId) {
            toast.error("Order data is missing. Please refresh the page."); // Use sonner toast
            return;
        }
        // Ensure payment status is not already paid
        if (finalOrderData.payment?.status === 'paid') {
            toast.info("This order is already paid."); // Use sonner toast
            navigate(`/confirmation/${finalOrderId}`); // Redirect to confirmation
            return;
        }
        // Ensure price is valid
        if (!finalOrderData.price || finalOrderData.price <= 0) {
            toast.error("Cannot process payment for invalid amount.");
            console.error("Invalid order price:", finalOrderData.price);
            return;
        }


        setIsLoading(true); // Start loading for Paystack initiation

        try {
            // Ensure order document exists before initiating payment
            const orderRef = doc(db, "orders", finalOrderId);
            const orderSnap = await getDoc(orderRef);

            let orderExists = orderSnap.exists();

            // --- IF the order document doesn't exist yet, create it here ---
            // This handles cases where the user might jump directly or localStorage was cleared
            if (!orderExists) {
                console.warn(`Order document ${finalOrderId} not found before payment. Creating it now.`);
                // Use data retrieved earlier or from localStorage if available as a fallback
                // Ideally, re-fetch necessary data from previous steps if possible, but localStorage might be the only source here.
                // This fallback structure MUST align with your Order type and admin expectations.
                const fallbackOrderData = localStorage.getItem("orderData") ? JSON.parse(localStorage.getItem("orderData")!) : null; // Use orderData from localStorage as fallback

                if (!fallbackOrderData) {
                    toast.error("Critical order data missing. Cannot create order.");
                    setIsLoading(false);
                    navigate("/dashboard"); // Redirect to start
                    return;
                }

                const initialOrderDoc: Omit<Order, 'id'> = {
                    userId: user.uid,
                    contactInfo: {
                        name: fallbackOrderData.name || "",
                        email: fallbackOrderData.email || "",
                        phone: fallbackOrderData.phone || "",
                        // Address saved in contactInfo if delivery method was delivery
                        address: fallbackOrderData.deliveryMethod === 'delivery' ? (fallbackOrderData.deliveryAddress || "") : undefined, // Use undefined if not delivery
                    },
                    repairType: fallbackOrderData.selectedOption || fallbackOrderData.repairType || "", // Use the ID from GetQuote
                    repairDescription: fallbackOrderData.selectedOption?.description || fallbackOrderData.repairDescription || "", // Get description
                    price: fallbackOrderData.price || 0,
                    notes: fallbackOrderData.additionalNotes || fallbackOrderData.notes || "",

                    // --- Essential Processing Fields for Admin Queries ---
                    processing: {
                        status: "pending" as OrderStatus, // <-- Initial status for OrdersTable query
                        repairStatus: "Pending Routing" as RepairStatus, // <-- Initial status before admin routes

                        deliveryMethod: fallbackOrderData.deliveryMethod || "" as DeliveryMethod, // <-- Method from ScheduleService


                        // Set initial method-specific statuses based on the chosen method
                        dropoffStatus: fallbackOrderData.deliveryMethod === 'dropoff' ? "awaiting_dropoff" as DropoffStatus : undefined,
                        pickupStatus: fallbackOrderData.deliveryMethod === 'pickup' ? "awaiting_pickup" as PickupStatus : undefined,
                        deliveryStatus: fallbackOrderData.deliveryMethod === 'delivery' ? "awaiting_delivery" as DeliveryStatus : undefined,

                        duration: fallbackOrderData.duration || "",
                        preferredDate: fallbackOrderData.preferredDate || "", // Customer's preferred date string


                        // Placeholder locations
                        dropoffLocation: fallbackOrderData.deliveryMethod === 'dropoff' ? "KitFix Store Address" : undefined,
                        pickupLocation: fallbackOrderData.deliveryMethod === 'pickup' ? "KitFix Store Address" : undefined,
                        // deliveryAddress is in contactInfo
                    },
                    // --- End Essential Processing Fields ---
                    payment: {
                        amount: fallbackOrderData.price || 0,
                        status: "unpaid" as PaymentStatus, // Initially unpaid
                        method: null,
                        reference: null,
                        paidAt: null,
                    },
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    // Add photos if available in fallback data
                    photos: fallbackOrderData.photos || undefined,
                    stepCompleted: ''
                };

                // Clean up undefined fields before setting
                Object.keys(initialOrderDoc).forEach(key =>
                    (initialOrderDoc as any)[key] === undefined && delete (initialOrderDoc as any)[key]
                );
                if (initialOrderDoc.contactInfo) Object.keys(initialOrderDoc.contactInfo).forEach(key => (initialOrderDoc.contactInfo as any)[key] === undefined && delete (initialOrderDoc.contactInfo as any)[key]);
                if (initialOrderDoc.processing) Object.keys(initialOrderDoc.processing).forEach(key => (initialOrderDoc.processing as any)[key] === undefined && delete (initialOrderDoc.processing as any)[key]);
                if (initialOrderDoc.payment) Object.keys(initialOrderDoc.payment).forEach(key => (initialOrderDoc.payment as any)[key] === undefined && delete (initialOrderDoc.payment as any)[key]);


                // Set the document with the determined finalOrderId
                await setDoc(orderRef, initialOrderDoc);
                orderExists = true; // Mark as exists now

                toast.info("Created missing order document before payment."); // Inform user/developer

            }
            // --- END IF order document doesn't exist ---


            // Initiate Paystack ONLY if the order document exists
            if (orderExists) {
                const paystack = (window as any).PaystackPop.setup({
                    key: publicKey, // Use environment variable
                    email: finalOrderData.contactInfo?.email, // Use email from fetched data
                    amount: finalOrderData.price * 100, // Use price from fetched data (in kobo/cents)
                    currency: "ZAR",
                    metadata: {
                        orderId: finalOrderId, // Pass orderId in metadata
                        // Pass other details for context
                        name: finalOrderData.contactInfo?.name,
                        phone: finalOrderData.contactInfo?.phone,
                        email: finalOrderData.contactInfo?.email,
                        deliveryMethod: finalOrderData.processing?.deliveryMethod,
                        repairType: finalOrderData.repairType,
                        price: finalOrderData.price,
                    },
                    callback: (response: any) => {
                        console.log("Paystack callback received:", response);
                        // Call success handler with the reference
                        handlePaymentSuccess(response.reference);
                        // Loading state is handled in handlePaymentSuccess's finally
                    },
                    onClose: () => {
                        toast.info("Payment cancelled", { description: "You closed the payment window." }); // Use sonner toast
                        setIsLoading(false); // Turn off loading here
                    },
                });

                paystack.openIframe();
            } else {
                // Should not happen if creation logic is correct, but as a fallback
                toast.error("Could not confirm order existence. Cannot initiate payment.");
                setIsLoading(false);
            }


        } catch (error) {
            console.error("Error initiating payment or creating/updating order:", error);
            toast.error("Payment Failed", { description: "Could not initiate payment. Please check console." }); // Use sonner toast
            setIsLoading(false); // Turn off loading on error
        }
    };

    // No form fields to handle changes for in this view if it's just review
    // const handleInputChange = (field: string, value: any) => { ... }; // REMOVE IF NOT USED

    // Show page loading state
    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    // Render nothing or an error message if finalOrderData is null after loading
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
                            {/* Remove FormProvider and Form if not using react-hook-form components */}
                            {/* <FormProvider {...methods}> */}
                            {/* <Form {...methods}> */}
                            <div className="grid grid-cols-1 gap-4 text-gray-700"> {/* Adjusted gap and added text color */}
                                {/* Display Fields - Read Only */}
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

                                {/* Display address if it exists */}
                                {finalOrderData.contactInfo?.address && (
                                    <div>
                                        <strong>Address:</strong> {finalOrderData.contactInfo.address}
                                    </div>
                                )}

                                <div>
                                    <strong>Repair Type:</strong> {finalOrderData.repairDescription || finalOrderData.repairType || 'N/A'} {/* Show description if available */}
                                </div>
                                <div>
                                    <strong>Processing Time:</strong> {finalOrderData.processing?.duration || 'N/A'}
                                </div>
                                {finalOrderData.notes && (
                                    <div>
                                        <strong>Additional Notes:</strong> {finalOrderData.notes}
                                    </div>
                                )}

                                <div>
                                    <strong>Delivery Method:</strong>{" "}
                                    {finalOrderData.processing?.deliveryMethod ? finalOrderData.processing.deliveryMethod.charAt(0).toUpperCase() + finalOrderData.processing.deliveryMethod.slice(1) : 'N/A'}
                                </div>

                                {/* Display Preferred Date */}
                                {finalOrderData.processing?.preferredDate && (
                                    <div>
                                        <strong>Preferred Date:</strong> {finalOrderData.processing.preferredDate}
                                    </div>
                                )}
                            </div>
                            {/* </Form> */}
                            {/* </FormProvider> */}

                            <Separator className="my-4" /> {/* Add separator before total */}

                            {/* Display Total */}
                            <div className="flex justify-between items-center font-bold text-xl"> {/* Made total larger/bolder */}
                                <span>Total Amount:</span>
                                <span className="text-electric-blue">R{finalOrderData.price?.toFixed(2) || '0.00'}</span> {/* Ensure price is displayed */}
                            </div>


                            <Button className="w-full mt-6" onClick={handlePaystack} disabled={isLoading || pageLoading}>
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Pay Now (R{finalOrderData.price?.toFixed(2) || '0.00'}) {/* Show price on button */}
                            </Button>

                            {/* Add a Back button */}
                            <Button className="w-full" variant="outline" onClick={() => navigate(`/schedule-service?orderId=${finalOrderId}`)} disabled={isLoading || pageLoading}>
                                Back to Schedule
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PaymentPage;