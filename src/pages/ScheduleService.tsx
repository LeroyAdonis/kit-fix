// src/pages/ScheduleService.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { toast } from "sonner"; // Use sonner toast

// Import types
import { Order, OrderStatus, DeliveryMethod, DropoffStatus, PickupStatus, DeliveryStatus, ContactInfo, ProcessingInfo } from '@/types/order';
import { Loader2, MapPin } from "lucide-react"; // Import necessary icons
import { Button } from "@/components/ui/button"; // Import Button if used in JSX
import Header from "@/components/Header";
import Footer from "@/components/Footer";


/**
 * ScheduleService component handles the scheduling of repair services. It utilizes
 * a form to collect user information and preferences for repair scheduling.
 * It populates the form with existing order data, allows updates, validates data,
 * and saves to Firestore before navigating to payment.
 */

const scheduleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Phone number is required"),
    deliveryMethod: z.enum(["pickup", "dropoff", "delivery"]), // Ensure 'delivery' is an option if used
    deliveryAddress: z.string().optional(), // Make optional initially

    // repairType is from the quote, maybe just display it, not require in this form schema
    // repairType: z.string().min(1, "Repair type is required"), // Removed as it's set in Quote

    preferredDate: z.string().min(1, "Preferred date is required"), // Customer's preferred date string
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const ScheduleService = () => {
    // --- ALL HOOK CALLS MUST BE AT THE TOP LEVEL, BEFORE ANY CONDITIONAL RETURNS ---
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId"); // orderId is derived here

    const [pageLoading, setPageLoading] = useState(true); // Loading state for initial fetch
    const [isSaving, setIsSaving] = useState(false); // Loading state for form submission
    const [fetchedRepairType, setFetchedRepairType] = useState(''); // <-- Moved useState here

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        setValue,
        getValues,
    } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            // Ensure default matches a valid enum value
            deliveryMethod: "pickup",
            name: '', email: '', phone: '', deliveryAddress: '', preferredDate: ''
        },
        mode: "onBlur", // Validate on blur for better UX
    });

    const deliveryMethod = watch("deliveryMethod"); // Watch deliveryMethod for conditional fields


    // Add refinement to schema for deliveryAddress based on deliveryMethod (Alternative to manual check)
    // This attaches the refinement logic to the schema used by useForm
    const refinedScheduleSchema = scheduleSchema.refine((data) => {
        if (data.deliveryMethod === 'delivery' && (!data.deliveryAddress || data.deliveryAddress.trim() === '')) {
            return false; // Return false if validation fails
        }
        return true; // Return true if validation passes
    }, {
        message: "Delivery address is required for delivery method.", // Error message
        path: ["deliveryAddress"], // Field the error applies to
    });

    // Re-initialize form with refined schema resolver if using refinement this way
    // If you moved the refinement outside the component, you can pass refinedScheduleSchema directly to useForm above.
    // Let's apply the refinement directly in the useForm call for clarity.

    // --- Re-initializing useForm with the refined schema ---
    // const {
    //     register, handleSubmit, watch, formState: { errors }, setValue, getValues,
    // } = useForm<ScheduleFormData>({
    //     resolver: zodResolver(refinedScheduleSchema), // Use the refined schema here
    //     defaultValues: { deliveryMethod: "pickup", name: '', email: '', phone: '', deliveryAddress: '', preferredDate: '' },
    //     mode: "onBlur",
    // });
    // Note: If you move the schema definition outside the component, useForm call looks cleaner.
    // Let's use the refinement approach in the onSubmit handler alongside Zod's object validation.


    // --- Effects ---

    // Effect to fetch initial order data and populate form/check step completion
    useEffect(() => {
        const fetchData = async () => {
            setPageLoading(true); // Start page loading

            if (!orderId) {
                toast.error("Missing order ID. Cannot schedule service.");
                navigate("/dashboard"); // Redirect to a safe page
                setPageLoading(false); // Ensure loading is stopped
                return;
            }

            try {
                const orderRef = doc(db, "orders", orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const data = orderSnap.data() as Order; // Cast fetched data

                    // Populate form with existing data
                    const contact = data.contactInfo || {};
                    const processing = data.processing || {};
                    const repairType = data.repairType; // Get repairType from top level

                    // Use setValue to populate form fields
                    setValue("name", contact.name || "");
                    setValue("email", contact.email || "");
                    setValue("phone", contact.phone || "");

                    // Populate delivery method and address
                    setValue("deliveryMethod", processing.deliveryMethod || "pickup");
                    // deliveryAddress in form is for the *delivery back* address if method is delivery
                    // Prioritize contactInfo.address for delivery address, fallback to processing.deliveryAddress if needed
                    setValue("deliveryAddress", contact.address || processing.deliveryAddress || "");


                    // Populate preferred date (should be saved as string)
                    setValue("preferredDate", processing.preferredDate || "");

                    // Set the fetched repair type for display
                    setFetchedRepairType(repairType || '');


                    // Check if schedule step is already completed and redirect
                    // If stepCompleted tracking is used and it matches the current step's completion marker
                    if (data.stepCompleted === 'schedule') {
                        console.log("Schedule step already completed for order", orderId);
                        // Redirect to the next step (Payment)
                        navigate(`/payment?orderId=${orderId}`);
                        setPageLoading(false); // Ensure loading is stopped before redirect
                        return; // Stop further execution
                    }

                } else {
                    // Order ID not found in DB
                    console.error("Order ID not found in database:", orderId);
                    toast.error("Order not found. Please restart your repair.");
                    navigate("/dashboard"); // Redirect to a safe page
                }
            } catch (error) {
                console.error("Error fetching order data for schedule:", error);
                toast.error("Failed to load order data. Please try again.");
            } finally {
                setPageLoading(false); // Stop page loading
            }
        };

        // Only fetch if orderId is available
        if (orderId) {
            fetchData();
        } else {
            // Handle the case where orderId is initially missing on mount
            setPageLoading(false);
            toast.error("Missing order ID. Please restart your repair.");
            // Use a timeout before navigating to allow toast to show
            setTimeout(() => {
                navigate("/dashboard");
            }, 50); // Small delay
        }

        // Add orderId, setValue, navigate, setFetchedRepairType to dependency array
        // Note: setFetchedRepairType is only needed because it's called inside the effect
    }, [orderId, setValue, navigate, setFetchedRepairType]);


    // Auto-save to localStorage (optional draft feature)
    useEffect(() => {
        // Only auto-save if we have an orderId (to link draft to order) and user is logged in (optional)
        // const user = auth.currentUser; // Get user here if not using useAuthState globally
        // if (orderId && user) {
        //    const subscription = watch((value) => {
        //        // Save form values to localStorage linked to orderId and user
        //        localStorage.setItem(`kitfix-${user.uid}-${orderId}-schedule-data`, JSON.stringify(value));
        //    });
        //    return () => subscription.unsubscribe();
        // }
        // Note: If you re-enable, ensure localStorage loading in initial effect handles this key.
    }, [watch, orderId]); // Add orderId to dependencies


    // Define the submit handler
    const onSubmit = async (formData: ScheduleFormData) => {
        // orderId should always be available via URL params/state from previous steps
        // This check is technically redundant due to the effect, but safe
        if (!orderId) {
            toast.error("Order ID not found. Cannot save schedule.");
            return;
        }

        // --- Manual validation for deliveryAddress if method is 'delivery' ---
        // This check is necessary because Zod's conditional validation might not halt submission immediately
        // or setting up the resolver with refine inside the component is complex.
        if (formData.deliveryMethod === 'delivery' && (!formData.deliveryAddress || formData.deliveryAddress.trim() === '')) {
            toast.error("Delivery address is required for delivery method.");
            // You might want to highlight the field here manually or let Zod errors handle it.
            // Returning stops the async submission.
            return;
        }
        // --- End Manual validation ---


        setIsSaving(true); // Start saving loading state

        try {
            const orderRef = doc(db, "orders", orderId);

            // Fetch existing order data to merge updates - CRITICAL for not overwriting admin status
            const orderSnap = await getDoc(orderRef);
            const existingOrderData = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrderData) {
                toast.error("Order not found. Cannot save schedule.");
                setIsSaving(false); // Stop saving loading
                navigate("/dashboard"); // Redirect to a safe page
                return;
            }

            const isPickup = formData.deliveryMethod === "pickup";
            const isDropoff = formData.deliveryMethod === "dropoff";
            const isDelivery = formData.deliveryMethod === "delivery";

            // --- Construct contactInfo updates carefully ---
            const contactInfoUpdates: Partial<ContactInfo> = {
                ...(existingOrderData.contactInfo || {}), // Start with existing contact info
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
            };

            // Conditionally add or remove the address field
            if (isDelivery && formData.deliveryAddress && formData.deliveryAddress.trim() !== '') {
                // If method is delivery AND address is provided, set the address
                contactInfoUpdates.address = formData.deliveryAddress;
            } else if (!isDelivery && (existingOrderData.contactInfo?.address || '').trim() !== '') {
                // If method is NOT delivery, and there was an address saved previously,
                // you might want to remove it or set it to null.
                // Setting to null is safer than undefined inside the map.
                // If you want to *delete* the field entirely, you'd need FieldValue.delete()
                // For now, let's set it to null if changing away from delivery and it had a value.
                // If you don't want to remove it when switching, just remove this 'else if'.
                contactInfoUpdates.address = null; // Set to null
            }
            // If not delivery and no existing address, address is not included in updates, leaving it as is (presumably undefined/null)
            // If delivery but address is empty, address is not included in updates, leaving existing value.


            // --- Construct processing updates ---
            const processingUpdates: Partial<ProcessingInfo> = {
                ...(existingOrderData.processing || {}), // Keep existing (like status, repairStatus)

                deliveryMethod: formData.deliveryMethod, // Update delivery method
                preferredDate: formData.preferredDate, // Save customer's preferred date string

                // Set initial method-specific statuses based on the chosen method
                // Use null instead of undefined for fields that are not relevant to the chosen method
                pickupStatus: isPickup ? "awaiting_pickup" as PickupStatus : null,
                dropoffStatus: isDropoff ? "awaiting_dropoff" as DropoffStatus : null,
                deliveryStatus: isDelivery ? "awaiting_delivery" as DeliveryStatus : null,


                // Method-specific location fields (placeholder - replace with actual logic if needed)
                // Use null instead of undefined
                dropoffLocation: isDropoff ? "KitFix Store Address" : null, // Placeholder location for customer info
                pickupLocation: isPickup ? "KitFix Store Address" : null,   // Placeholder location for customer info
                // deliveryAddress is handled in contactInfo.address if delivery, so remove from processing if it exists there
                deliveryAddress: null, // Explicitly set to null in processing if it exists from older data structure


                // Do NOT touch 'status' or 'repairStatus' here. They are set by PaymentPage (initial) and Admin (routing).
            };


            const updates: Partial<Order> = {
                contactInfo: contactInfoUpdates, // Use the constructed object
                processing: processingUpdates,   // Use the constructed object
                stepCompleted: "schedule", // Track step completion
                updatedAt: serverTimestamp(), // Update timestamp on server
            };

            // updateDoc automatically removes fields set to undefined at the top level.
            // It does NOT automatically remove fields set to undefined within nested maps.
            // We used `null` for method-specific statuses/locations and handled contactInfo.address
            // via conditional inclusion or setting to `null`. This should prevent `undefined` errors.


            await updateDoc(orderRef, updates);

            setIsSaving(false); // Stop saving loading
            toast.success("Schedule saved! Proceeding to payment...");

            // Navigate to payment page, ensure orderId is in params
            navigate(`/payment?orderId=${orderId}`);

        } catch (error) {
            setIsSaving(false); // Stop saving loading
            console.error("Error saving schedule info:", error);
            toast.error("Something went wrong while saving. Please try again.");
        }
    };


    return (
        <div className='min-h-screen flex flex-col'>
            <Header />
            <main className='flex-grow py-16 px-4'>
                <div className='container-custom max-w-3xl'>
                    <div className='glass-card p-8'>
                        <h1 className='text-2xl font-bold mb-4'>Schedule Your Repair</h1>
                        {/* Ensure orderId is not null before accessing slice */}
                        <p className="text-gray-600 mb-6">
                            Order: <strong>{orderId ? orderId.slice(0, 6).toUpperCase() : 'N/A'}</strong> - Repair Type: <strong>{fetchedRepairType || 'N/A'}</strong>
                        </p>

                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'> {/* Use react-hook-form's handleSubmit wrapper */}
                            <div>
                                <label htmlFor="name" className='block font-medium'>Full Name</label>
                                <input id="name" {...register("name")} className='w-full border p-2 rounded' />
                                {errors.name && <p className='text-red-500 text-sm'>{errors.name.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className='block font-medium'>Email</label>
                                <input id="email" type='email' {...register("email")} className='w-full border p-2 rounded' />
                                {errors.email && <p className='text-red-500 text-sm'>{errors.email.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="phone" className='block font-medium'>Phone</label>
                                <input id="phone" type='tel' {...register("phone")} className='w-full border p-2 rounded' />
                                {errors.phone && <p className='text-red-500 text-sm'>{errors.phone.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="deliveryMethod" className='block font-medium'>How will you get the jersey to/from KitFix?</label>
                                {/* Added 'delivery' option if schema supports it */}
                                <select id="deliveryMethod" {...register("deliveryMethod")} className='w-full border p-2 rounded'>
                                    <option value='dropoff'>Dropoff at KitFix</option> {/* Changed text for clarity */}
                                    <option value='pickup'>Pickup from KitFix (after repair)</option> {/* Changed text */}
                                    <option value='delivery'>Delivery by KitFix (after repair)</option> {/* Added delivery */}
                                </select>
                                {/* No error message needed here based on schema */}
                            </div>

                            {/* Show delivery address ONLY if method is 'delivery' */}
                            {deliveryMethod === "delivery" && (
                                <div>
                                    <label htmlFor="deliveryAddress" className='block font-medium'>Your Delivery Address (after repair)</label>
                                    <input id="deliveryAddress" {...register("deliveryAddress")} className='w-full border p-2 rounded' placeholder="Full delivery address" />
                                    {/* Zod refinement will add error to deliveryAddress path, or manual check handles it */}
                                    {errors.deliveryAddress && <p className='text-red-500 text-sm'>{errors.deliveryAddress.message}</p>}
                                </div>
                            )}

                            {/* Provide info about Dropoff/Pickup Location (optional display) */}
                            {deliveryMethod === "dropoff" && (
                                <div className="bg-blue-50 p-3 rounded-md text-sm text-gray-700">
                                    <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                    Dropoff Location: KitFix Store Address (Placeholder - display actual address here)
                                </div>
                            )}
                            {deliveryMethod === "pickup" && (
                                <div className="bg-blue-50 p-3 rounded-md text-sm text-gray-700">
                                    <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                    Pickup Location: KitFix Store Address (Placeholder - display actual address here)
                                </div>
                            )}


                            <div>
                                <label htmlFor="preferredDate" className='block font-medium'>Preferred Date for {deliveryMethod === 'dropoff' ? 'Dropoff' : deliveryMethod === 'pickup' ? 'Pickup' : deliveryMethod === 'delivery' ? 'Delivery' : 'Service'}</label> {/* Dynamic label */}
                                <input id="preferredDate" type='date' {...register("preferredDate")} className='w-full border p-2 rounded' />
                                {errors.preferredDate && (
                                    <p className='text-red-500 text-sm'>{errors.preferredDate.message}</p>
                                )}
                            </div>

                            {/* Add a Back button */}
                            <div className="flex justify-between mt-6">
                                {/* Navigate back to get-quote, passing orderId */}
                                <Button type="button" variant="outline" onClick={() => navigate(`/get-quote?orderId=${orderId}`)} disabled={isSaving}>
                                    Back to Quote
                                </Button>
                                <Button type='submit' disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Continue to Payment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ScheduleService;