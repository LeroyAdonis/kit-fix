/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { toast } from "sonner"; // Use sonner toast

// Import types - Updated to use InitialMethod and FulfillmentMethod
import { Order, InitialMethod, FulfillmentMethod, ContactInfo, ProcessingInfo } from '@/types/order';
import { Loader2, MapPin } from "lucide-react"; // Import necessary icons
import { Button } from "@/components/ui/button"; // Import Button if used in JSX
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup
import { Label } from "@/components/ui/label";
import { useAuthState } from "react-firebase-hooks/auth";

/**
 * ScheduleService component handles the scheduling of repair services. It utilizes
 * a form to collect user information and preferences for repair scheduling.
 * It captures initial transfer method, fulfillment method, contact details,
 * and preferred date.
 */

const scheduleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Phone number is required"),
    // Use InitialMethod type
    initialMethod: z.enum(["pickup", "dropoff"]), // How they get TO KitFix
    // Use FulfillmentMethod type
    fulfillmentMethod: z.enum(["pickup", "delivery"]), // How they get BACK to customer

    // Delivery address is required only if fulfillmentMethod is 'delivery'
    deliveryAddress: z.string().optional(), // Address for KitFix Delivery

    // repairType is from the quote, just display it
    // preferredDate is required, its meaning depends on initial/fulfillment methods
    preferredDate: z.string().min(1, "Preferred date is required"),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const ScheduleService = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [user] = useAuthState(auth);
    const orderId =
        searchParams.get('orderId') ||
        location.state?.orderId ||
        (user
            ? localStorage.getItem(`kitfix-${user.uid}-order-id`)
            : localStorage.getItem('kitfix-guest-order-id'));

    const [pageLoading, setPageLoading] = useState(true); // Loading state for initial fetch
    const [isSaving, setIsSaving] = useState(false); // Loading state for form submission
    const [fetchedRepairType, setFetchedRepairType] = useState(''); // From Quote Page

    const fromPayment = location.state?.fromPayment;

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
            // Ensure defaults match valid enum values
            initialMethod: "dropoff", // Default how they get it to KitFix
            fulfillmentMethod: "pickup", // Default how they get it back
            name: '', email: '', phone: '', deliveryAddress: '', preferredDate: ''
        },
        mode: "onBlur", // Validate on blur for better UX
    });

    // Watch methods for conditional fields/text
    const initialMethod = watch("initialMethod");
    const fulfillmentMethod = watch("fulfillmentMethod");


    // Manual validation for deliveryAddress if fulfillmentMethod is 'delivery'
    useEffect(() => {
        if (fulfillmentMethod === 'delivery') {
            scheduleSchema.pick({ deliveryAddress: true }).safeParse(getValues('deliveryAddress'));
        }
    }, [fulfillmentMethod, watch, getValues]); // Added getValues to dependencies


    // Effect to fetch initial order data and populate form/check step completion
    useEffect(() => {
        const fetchData = async () => {
            setPageLoading(true);

            if (!orderId) {
                toast.error("Missing order ID. Cannot schedule service.");
                navigate("/dashboard");
                setPageLoading(false);
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


                    setValue("name", contact.name || "");
                    setValue("email", contact.email || "");
                    setValue("phone", contact.phone || "");

                    // Populate initial method, fulfillment method, and address
                    setValue("initialMethod", processing.initialMethod || "dropoff"); // Use initialMethod
                    setValue("fulfillmentMethod", processing.fulfillmentMethod || "pickup"); // Use fulfillmentMethod
                    // Delivery address from form is for KitFix delivering BACK
                    // This should be saved in contactInfo.address OR kitFixDeliveryAddress
                    // Let's standardize on saving it in contactInfo.address for delivery fulfillment
                    setValue("deliveryAddress", contact.address || processing.kitFixDeliveryAddress || "");


                    // Populate preferred date (should be saved as string)
                    setValue("preferredDate", processing.preferredDate || "");

                    // Set the fetched repair type for display
                    setFetchedRepairType(repairType || '');


                    // Check if schedule step is already completed and redirect
                    if (data.stepCompleted === 'schedule' && !location.state && fromPayment) {
                        console.log("Schedule step already completed for order", orderId);
                        navigate(`/payment?orderId=${orderId}`);
                        setPageLoading(false);
                        return;
                    }

                } else {
                    console.error("Order ID not found in database:", orderId);
                    toast.error("Order not found. Please restart your repair.");
                    navigate("/dashboard");
                }
            } catch (error) {
                console.error("Error fetching order data for schedule:", error);
                toast.error("Failed to load order data. Please try again.");
            } finally {
                setPageLoading(false);
            }
        };

        if (orderId) {
            fetchData();
        } else if (!searchParams.get('orderId') && (!location as any).state?.orderId) { // Check if orderId was never provided
            setPageLoading(false);
            toast.error("Missing order ID. Please restart your repair process.");
            setTimeout(() => { navigate("/upload-photos"); }, 50); // Redirect to start
        } else {
            // If orderId is in params/state but not found, error is already handled above
            setPageLoading(false);
        }


        // Add orderId, setValue, navigate, setFetchedRepairType, initialMethod, fulfillmentMethod to dependency array
        // Including initialMethod and fulfillmentMethod because setting deliveryAddress depends on fulfillmentMethod
    }, [orderId, setValue, navigate, setFetchedRepairType, searchParams, location]);


    // Override handleSubmit to include custom validation for deliveryAddress
    const handleFormSubmit = handleSubmit(async (formData: ScheduleFormData) => {
        // Manual validation for deliveryAddress if fulfillmentMethod is 'delivery'
        if (formData.fulfillmentMethod === 'delivery' && (!formData.deliveryAddress || formData.deliveryAddress.trim() === '')) {
            toast.error("Delivery address is required for delivery method.");
            return; // Stop submission
        }

        setIsSaving(true); // Start saving loading state

        if (!orderId) {
            toast.error("Order ID not found. Cannot save schedule.");
            setIsSaving(false);
            return;
        }

        try {
            const orderRef = doc(db, "orders", orderId);

            // Fetch existing order data to merge updates
            const orderSnap = await getDoc(orderRef);
            const existingOrderData = orderSnap.exists() ? orderSnap.data() as Order : null;

            if (!existingOrderData) {
                toast.error("Order not found. Cannot save schedule.");
                setIsSaving(false);
                navigate("/dashboard");
                return;
            }

            // Determine if fulfillment method is delivery
            const isFulfillmentDelivery = formData.fulfillmentMethod === "delivery";

            function removeUndefined<T extends object>(obj: T): Partial<T> {
                return Object.fromEntries(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    Object.entries(obj).filter(([_, v]) => v !== undefined)
                ) as Partial<T>;
            }

            // Construct contactInfo updates
            const contactInfoUpdates: Partial<ContactInfo> = {
                ...(existingOrderData.contactInfo || {}), // Start with existing
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                // Save delivery address in contactInfo if fulfillment method is delivery
                // Use null to remove the field if not fulfillment delivery, ensures clean data
                address: isFulfillmentDelivery ? (formData.deliveryAddress || undefined) : undefined, // Save if fulfillment delivery, otherwise null
            };

            // Construct processing updates
            const processingUpdates: Partial<ProcessingInfo> = {
                ...(existingOrderData.processing || {}), // Keep existing (like status, repairStatus)

                initialMethod: formData.initialMethod, // <-- Save initialMethod
                fulfillmentMethod: formData.fulfillmentMethod, // <-- Save fulfillmentMethod
                preferredDate: formData.preferredDate, // Save customer's preferred date string

                // Do NOT set method-specific sub-statuses (awaiting_...) here.
                // They are implicit from the main status and repairStatus, or set by managers.
                // Do NOT touch 'status' or 'repairStatus' here. They are set by PaymentPage (initial) and Admin (routing/workflow).

                // Method-specific location fields - use null instead of undefined
                // These locations are less critical than contactInfo.address for delivery fulfillment
                // You might save store address placeholders here if needed for display
                customerDropoffLocation: formData.initialMethod === 'dropoff' ? "KitFix Store Address (Placeholder)" : undefined,
                initialPickupLocation: formData.initialMethod === 'pickup' ? (formData.deliveryAddress || existingOrderData.contactInfo?.address || undefined) : undefined, // If initial is pickup, use contact address? Revisit this field's purpose. Let's use contactInfo.address for KitFix pickup.
                customerPickupLocation: formData.fulfillmentMethod === 'pickup' ? "KitFix Store Address (Placeholder)" : undefined,
                kitFixDeliveryAddress: isFulfillmentDelivery ? (formData.deliveryAddress || undefined) : undefined, // Redundant with contactInfo.address if saving there, but keep for clarity
            };

            const updates: Partial<Order> = {
                contactInfo: removeUndefined(contactInfoUpdates) as ContactInfo, // Use the constructed object
                processing: removeUndefined(processingUpdates) as ProcessingInfo,   // Use the constructed object
                stepCompleted: "schedule", // Track step completion
                updatedAt: serverTimestamp(), // Update timestamp on server
            };

            await updateDoc(orderRef, updates);

            setIsSaving(false);
            toast.success("Schedule saved! Proceeding to payment...");

            // Navigate to payment page, ensure orderId is in params
            navigate(`/payment?orderId=${orderId}`);

        } catch (error) {
            setIsSaving(false);
            console.error("Error saving schedule info:", error);
            toast.error("Something went wrong while saving. Please try again.");
        }
    });


    // Show page loading state early
    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    // Handle case where orderId is missing after loading (fallback)
    if (!orderId) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600">
                Order ID missing. Please restart the repair process.
            </div>
        );
    }


    return (
        <div className='min-h-screen flex flex-col'>
            <Header />
            <main className='flex-grow py-16 px-4'>
                <div className='container-custom max-w-3xl'>
                    <div className='glass-card p-8'>
                        <h1 className='text-2xl font-bold mb-4'>Schedule Your Repair</h1>
                        <p className="text-gray-600 mb-6">
                            Order: <strong>{orderId.slice(0, 6).toUpperCase()}</strong> - Repair Type: <strong>{fetchedRepairType || 'N/A'}</strong>
                        </p>

                        <form onSubmit={handleFormSubmit} className='space-y-6'> {/* Increased space */}
                            {/* Contact Info Fields */}
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

                            <div className="space-y-4">
                                {/* Initial Method (How it gets TO KitFix) */}
                                <div>
                                    <label htmlFor="initialMethod" className='block font-medium mb-2'>How will the jersey get to KitFix?</label>
                                    <RadioGroup
                                        defaultValue="dropoff"
                                        value={initialMethod}
                                        onValueChange={(value: InitialMethod) => setValue("initialMethod", value)}
                                        className="grid grid-cols-2 gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="dropoff" id="initial-dropoff" />
                                            <Label htmlFor="initial-dropoff">Customer Dropoff</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="pickup" id="initial-pickup" />
                                            <Label htmlFor="initial-pickup">KitFix Pickup</Label>
                                        </div>
                                    </RadioGroup>
                                    {errors.initialMethod && <p className='text-red-500 text-sm'>{errors.initialMethod.message}</p>}
                                </div>

                                {/* Fulfillment Method (How it gets BACK to customer) */}
                                <div>
                                    <label htmlFor="fulfillmentMethod" className='block font-medium mb-2'>How will you get the jersey back?</label>
                                    <RadioGroup
                                        defaultValue="pickup"
                                        value={fulfillmentMethod}
                                        onValueChange={(value: FulfillmentMethod) => setValue("fulfillmentMethod", value)}
                                        className="grid grid-cols-2 gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="pickup" id="fulfillment-pickup" />
                                            <Label htmlFor="fulfillment-pickup">Customer Pickup</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="delivery" id="fulfillment-delivery" />
                                            <Label htmlFor="fulfillment-delivery">KitFix Delivery</Label>
                                        </div>
                                    </RadioGroup>
                                    {errors.fulfillmentMethod && <p className='text-red-500 text-sm'>{errors.fulfillmentMethod.message}</p>}
                                </div>
                            </div>


                            {/* Conditional Address Field - Show ONLY if fulfillmentMethod is DELIVERY */}
                            {fulfillmentMethod === "delivery" && (
                                <div>
                                    <label htmlFor="deliveryAddress" className='block font-medium'>Your Delivery Address (after repair)</label>
                                    <input id="deliveryAddress" {...register("deliveryAddress")} className='w-full border p-2 rounded' placeholder="Full delivery address" />
                                    {errors.deliveryAddress && <p className='text-red-500 text-sm'>{errors.deliveryAddress.message}</p>}
                                </div>
                            )}

                            {/* Provide info about locations based on selected methods */}
                            <div className="bg-blue-50 p-3 rounded-md text-sm text-gray-700 space-y-2">
                                {initialMethod === "dropoff" && (
                                    <p className="text-gray-700">
                                        <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                        <strong>Dropoff Location:</strong> KitFix Store Address (Placeholder)
                                    </p>
                                )}
                                {initialMethod === "pickup" && (
                                    <p className="text-gray-700">
                                        <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                        <strong>KitFix Pickup From:</strong> Your Contact Address
                                    </p>
                                )}
                                {fulfillmentMethod === "pickup" && (
                                    <p className="text-gray-700">
                                        <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                        <strong>Pickup Location (after repair):</strong> KitFix Store Address (Placeholder)
                                    </p>
                                )}
                                {fulfillmentMethod === "delivery" && (
                                    <p className="text-gray-700">
                                        <MapPin className="inline mr-1 h-4 w-4 text-blue-500" />
                                        <strong>KitFix Delivery To:</strong> Your Delivery Address
                                    </p>
                                )}
                            </div>


                            <div>
                                <label htmlFor="preferredDate" className='block font-medium'>Preferred Date for Service / Return</label> {/* Generic label */}
                                <input id="preferredDate" type='date' {...register("preferredDate")} className='w-full border p-2 rounded' />
                                {errors.preferredDate && (
                                    <p className='text-red-500 text-sm'>{errors.preferredDate.message}</p>
                                )}
                            </div>

                            {/* Back and Continue Buttons */}
                            <div className="flex justify-between mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(`/get-quote?orderId=${orderId}`, { state: { fromSchedule: true } })}
                                    disabled={isSaving}
                                >
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