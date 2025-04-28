import { setDoc, collection, updateDoc, doc, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { toast } from 'sonner'; // Use sonner

import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Import types - Ensure all types are imported
import { Order, OrderStatus, PaymentStatus, RepairStatus, InitialMethod, FulfillmentMethod, ProcessingInfo, ContactInfo } from '@/types/order';
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

    const [user] = useAuthState(auth);
    const [isLoading, setIsLoading] = useState(false); // Loading for Paystack initiation/payment process

    // State to hold the consolidated order data for display and payment
    // This state should ideally mirror the Firestore document structure as much as possible
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


    // Function called by Paystack on successful payment
    const handlePaymentSuccess = async (reference: string) => {
        // setIsLoading(true); // Loading is already true from handlePaystack

        if (!user) {
            toast.error("User not authenticated.");
            // setIsLoading(false); // Ensure loading is off on error
            return;
        }
        if (!finalOrderId) {
            toast.error("Order ID missing after payment.");
            // setIsLoading(false); // Ensure loading is off on error
            return;
        }
        // Use existingData for the update, as it's the most recent state from Firestore
        // finalOrderData is for display, but might be slightly older if updates happen elsewhere.
        // However, since this is a critical update, let's re-fetch one last time for safety or rely on existingOrderData from Paystack call
        // Let's rely on the existingData fetched right before the Paystack call in handlePaystack
        // We need existingData here, but it's only available in handlePaystack's try block.
        // A more robust pattern passes necessary data to handlePaymentSuccess.
        // For now, let's assume finalOrderData is sufficiently up-to-date OR re-fetch.
        // Re-fetching is safer but adds latency. Using finalOrderData might be acceptable post-payment if the only change is payment status.
        // Let's use finalOrderData as it's the current state the user sees.

        if (!finalOrderData) {
            toast.error("Order data missing for payment success update.");
            // setIsLoading(false); // Ensure loading is off on error
            navigate("/dashboard"); // Or handle error state
            return;
        }


        try {
            const orderRef = doc(db, "orders", finalOrderId);

            // Fetch existing data just to be absolutely sure (optional but robust)
            // const orderSnap = await getDoc(orderRef);
            // const existingOrderData = orderSnap.exists() ? orderSnap.data() as Order : null;
            // if (!existingOrderData) { ... handle error ... }
            // const sourceData = existingOrderData || finalOrderData; // Use fetched data if available


            // Only update payment and potentially the customer-facing top-level status.
            // Do NOT change processing.status or repairStatus here.
            // ContactInfo.address should be saved in ScheduleService.

            const updates: Partial<Order> = {
                payment: {
                    // Use data from finalOrderData state for amount, but merge with potential existing payment info
                    ...(finalOrderData.payment || {}), // Use finalOrderData's payment object as base
                    amount: finalOrderData.price, // Use price saved from quote (from finalOrderData)
                    reference: reference,
                    status: "paid" as PaymentStatus,
                    method: "Paystack", // Or get dynamically
                    paidAt: Timestamp.now(),
                },
                // Keep other fields as they are in finalOrderData state.
                // Do NOT touch processing.status or repairStatus here.

                updatedAt: serverTimestamp(), // Always update timestamp
            };

            // Perform the update
            await updateDoc(orderRef, updates);


            toast.success("Payment successful!", { description: "Your order has been placed." });

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
            toast.error("Something went wrong", { description: "We couldn't update your order status after payment." });
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
            toast.error("You must be logged in to pay.");
            return;
        }
        // Ensure we have final order data for display, but use fresh data for Paystack metadata
        if (!finalOrderData || !finalOrderId) {
            toast.error("Order data is missing. Please refresh the page.");
            return;
        }
        // Ensure payment status is not already paid
        if (finalOrderData.payment?.status === 'paid') {
            toast.info("This order is already paid.");
            navigate(`/confirmation/${finalOrderId}`);
            return;
        }
        // Ensure price is valid
        if (!finalOrderData.price || finalOrderData.price <= 0) {
            toast.error("Cannot process payment for invalid amount.");
            console.error("Invalid order price:", finalOrderData.price);
            return;
        }
        // Ensure initialMethod and fulfillmentMethod are set
        if (!finalOrderData.processing?.initialMethod || !finalOrderData.processing?.fulfillmentMethod) {
            toast.error("Order is missing initial or fulfillment method. Please go back to scheduling.");
            // Navigate back to schedule service
            navigate(`/schedule-service?orderId=${finalOrderId}`);
            return;
        }


        setIsLoading(true); // Start loading for Paystack initiation

        try {
            const orderId = finalOrderId;
            const orderRef = doc(db, "orders", orderId); // Assume order always exists at this point (created in UploadPhotos)

            // Fetch existing data to get the most accurate and complete order document
            const existingSnap = await getDoc(orderRef);
            const existingData = existingSnap.exists() ? existingSnap.data() as Order : null;

            if (!existingData) {
                toast.error("Critical error: Order not found before payment initiation.");
                setIsLoading(false);
                navigate("/dashboard"); // Redirect to a safe page
                return;
            }

            // Update the existing order document just before initiating Paystack
            // Primary update: set payment status to "unpaid" (in case user restarts payment)
            // Also update the stepCompleted field.
            const updates: Partial<Order> = {
                payment: {
                    ...(existingData.payment || {}), // Start with existing payment info
                    amount: existingData.price, // Use price from Firestore (most reliable)
                    status: "unpaid" as PaymentStatus, // Set status to unpaid before initiating payment
                    // method, reference, paidAt will be set in handlePaymentSuccess
                },
                stepCompleted: 'payment_initiated', // Indicate payment process started
                updatedAt: serverTimestamp(), // Update timestamp
            };

            // Perform the update
            await updateDoc(orderRef, updates);

            // Initiate Paystack using the orderId and data from existingData (most reliable)
            const paystack = (window as any).PaystackPop.setup({
                key: publicKey, // Use environment variable
                email: existingData.contactInfo?.email || existingData.userId, // Use email from fetched data or user ID
                amount: (existingData.price || 0) * 100, // Use price from fetched data (in kobo/cents)
                currency: "ZAR",
                metadata: {
                    orderId: orderId, // Pass orderId in metadata
                    // Pass other details for context from fetched data (existingData is reliable)
                    name: existingData.contactInfo?.name,
                    phone: existingData.contactInfo?.phone,
                    email: existingData.contactInfo?.email,
                    // Use the methods from the fetched data
                    initialMethod: existingData.processing?.initialMethod,
                    fulfillmentMethod: existingData.processing?.fulfillmentMethod,
                    repairType: existingData.repairType,
                    price: existingData.price,
                    // Add addresses/locations to metadata if useful
                    customerAddress: existingData.contactInfo?.address, // Customer's main address
                    dropoffLocation: existingData.processing?.customerDropoffLocation, // Store dropoff address
                    initialPickupLocation: existingData.processing?.initialPickupLocation, // KitFix pickup address from customer
                    customerPickupLocation: existingData.processing?.customerPickupLocation, // Customer pickup address from store
                    kitFixDeliveryAddress: existingData.processing?.kitFixDeliveryAddress, // KitFix delivery address to customer
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

                                {/* Display address if it exists in contactInfo */}
                                {/* Show contactInfo.address as the primary address */}
                                {finalOrderData.contactInfo?.address && (
                                    <div>
                                        <strong>Address:</strong> {finalOrderData.contactInfo.address}
                                    </div>
                                )}
                                {/* kitFixDeliveryAddress might be redundant now if address is always contactInfo.address for delivery fulfillment */}
                                {/* If it serves a different purpose (e.g., verified delivery address), keep it */}
                                {/* {finalOrderData.processing?.kitFixDeliveryAddress && (
                                    <div>
                                        <strong>Delivery Address:</strong> {finalOrderData.processing.kitFixDeliveryAddress}
                                    </div>
                                )} */}


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

                                {/* Display Initial and Fulfillment Methods */}
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