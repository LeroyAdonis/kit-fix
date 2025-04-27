import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Use sonner toast
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'; // Import serverTimestamp
import { getAuth } from "firebase/auth";
// import { set } from 'date-fns'; // No longer needed?
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from '@/firebaseConfig';
import { Loader2 } from 'lucide-react';

// Import types if needed for local state, but relying on Firestore data structure is key
// import { Order } from '@/types/order';


const auth = getAuth();
// Access userId safely via useAuthState or check auth.currentUser


type RepairOption = {
    id: string; // e.g., 'Basic', 'Premium'
    title: string;
    description: string;
    price: number;
    duration: string;
};




const repairOptions: RepairOption[] = [
    {
        id: 'Basic',
        title: 'Standard Repair',
        description: 'Basic name and number restoration with standard materials',
        price: 749.99,
        duration: '3-5 days'
    },
    {
        id: 'Premium',
        title: 'Premium Repair',
        description: 'Enhanced restoration with premium materials and badge repair',
        price: 1499.99,
        duration: '2-4 days'
    },
    {
        id: 'Express',
        title: 'Express Service',
        description: 'Premium repair with express processing and shipping',
        price: 1999.99,
        duration: '1-2 days'
    }
];

const GetQuote = () => {
    const [user] = useAuthState(auth);
    const [searchParams] = useSearchParams();
    const [userData, setUserData] = useState<any>(null); // Consider typing userData
    const [isLoading, setIsLoading] = React.useState(false); // Local loading state for form submission
    const [pageLoading, setPageLoading] = useState(true); // Loading state for initial data fetch
    const location = useLocation();
    const navigate = useNavigate();

    // Get orderId from params, state, or localStorage
    const orderId = searchParams.get('orderId') || location.state?.orderId || (user ? localStorage.getItem(`kitfix-${user.uid}-order-id`) : undefined);


    // Local state for form values, populated from localStorage or fetched data
    const [photos, setPhotos] = useState<string[]>(() => {
        const stored = user ? localStorage.getItem(`kitfix-${user.uid}-quote-photos`) : null;
        return stored ? JSON.parse(stored) : (location.state?.photos || []); // Also check location state
    });


    const [selectedOption, setSelectedOption] = useState<string>(() => {
        return user ? localStorage.getItem(`kitfix-${user.uid}-quote-repairType`) || "Basic" : "Basic";
    });


    const [additionalNotes, setAdditionalNotes] = useState<string>(() => {
        return user ? localStorage.getItem(`kitfix-${user.uid}-quote-notes`) || "" : "";
    });

    // Effect to fetch initial order data and populate form/check step completion
    useEffect(() => {
        const fetchAndPopulate = async () => {
            setPageLoading(true); // Start page loading

            if (!orderId) {
                // No orderId means the flow hasn't started or was interrupted early
                // Handle this case, maybe redirect to the beginning of the flow (e.g., upload-photos)
                console.warn("No order ID found on GetQuote page. Redirecting to upload-photos.");
                navigate('/upload-photos');
                setPageLoading(false); // Stop loading
                return;
            }

            try {
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();

                    // Populate form with existing data
                    if (orderData.photos) setPhotos(orderData.photos);
                    if (orderData.repairType) setSelectedOption(orderData.repairType); // Use the ID
                    if (orderData.notes) setAdditionalNotes(orderData.notes);

                    // Redirect if quote step is already completed
                    if (orderData.stepCompleted === 'quote') {
                        // Pass necessary data to the next step via state if not solely relying on Firestore
                        const selectedRepairOption = repairOptions.find(option => option.id === orderData.repairType);
                        navigate(`/schedule-service?orderId=${orderId}`, {
                            state: {
                                orderId,
                                photos: orderData.photos || [],
                                selectedOption: orderData.repairType,
                                price: orderData.price,
                                duration: selectedRepairOption?.duration, // Get duration based on fetched type
                                notes: orderData.notes || "",
                                description: orderData.repairDescription || ""
                            }
                        });
                        setPageLoading(false); // Stop loading before redirect
                        return; // Stop further execution
                    }

                    // Fetch user data if logged in
                    if (user) {
                        const userDocRef = doc(db, 'users', user.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            setUserData(userDocSnap.data());
                        }
                    }


                } else {
                    // Order ID from params/state/localStorage not found in DB
                    console.error("Order ID not found in database:", orderId);
                    toast.error("Order not found. Please restart your repair.");
                    // Clear potentially stale localStorage orderId
                    if (user) localStorage.removeItem(`kitfix-${user.uid}-order-id`);
                    navigate('/upload-photos'); // Redirect to start
                    setPageLoading(false); // Stop loading before redirect
                    return; // Stop further execution
                }
            } catch (error) {
                console.error("Error fetching initial order data or checking step:", error);
                toast.error("Error loading order data. Please try again.");
            } finally {
                setPageLoading(false); // Stop loading
            }
        };

        fetchAndPopulate();
        // Add user to dependency array to refetch user data if auth state changes
    }, [orderId, navigate, user]);


    // Effects to save state to localStorage whenever it changes
    useEffect(() => {
        if (user && orderId) { // Only save if user is logged in AND we have an orderId
            localStorage.setItem(`kitfix-${user.uid}-order-id`, orderId);
            localStorage.setItem(`kitfix-${user.uid}-quote-photos`, JSON.stringify(photos));
            localStorage.setItem(`kitfix-${user.uid}-quote-repairType`, selectedOption);
            localStorage.setItem(`kitfix-${user.uid}-quote-notes`, additionalNotes);
        }
    }, [user, orderId, photos, selectedOption, additionalNotes]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); // Start form submission loading

        if (!selectedOption) {
            toast.error('Please select a repair option');
            setIsLoading(false);
            return;
        }

        const selectedRepairOption = repairOptions.find(option => option.id === selectedOption);
        if (!selectedRepairOption) {
            toast.error('Invalid repair option selected');
            setIsLoading(false);
            return;
        }

        if (!orderId) {
            toast.error("Order ID not found. Cannot save quote.");
            setIsLoading(false);
            return;
        }

        try {
            const orderRef = doc(db, "orders", orderId);

            // Fetch existing order data to merge updates, especially for 'processing'
            // This is safer than assuming initial data is still in local state or location state
            const orderSnap = await getDoc(orderRef);
            const existingOrderData = orderSnap.exists() ? orderSnap.data() : {};
            const existingProcessing = existingOrderData.processing || {};

            const updates = {
                // Top-level fields from quote
                repairType: selectedOption, // Use the ID ('Basic', 'Premium')
                repairDescription: selectedRepairOption.description, // Save description
                price: selectedRepairOption.price,
                notes: additionalNotes,
                stepCompleted: "quote", // Keep step tracking

                // Merge processing fields, ONLY adding/updating duration here from quote
                processing: {
                    ...existingProcessing, // Keep existing processing fields (like initial status, deliveryMethod, awaiting_...)
                    duration: selectedRepairOption.duration, // Add/update duration from selected option
                    // Do NOT set status, deliveryMethod, repairStatus here - they are set by PaymentPage (initially)
                },

                updatedAt: serverTimestamp(), // Update timestamp on server
            };


            await updateDoc(orderRef, updates);

            setIsLoading(false);
            toast.success('Quote saved. Proceeding to scheduling.');

            // Pass necessary data to the next step if needed, though relying on Firestore is better
            // const quoteData = { ... };
            // localStorage.setItem("kitfix-quote-data", JSON.stringify(quoteData)); // Consider if still needed

            navigate(`/schedule-service?orderId=${orderId}`);

        } catch (error) {
            setIsLoading(false);
            console.error("Error updating order with quote data:", error);
            toast.error("Something went wrong while saving your quote.");
        }
    };

    const selectedRepairOption = repairOptions.find(option => option.id === selectedOption);

    // Show page loading state
    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-3xl">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-2">Get Your Quote</h1>
                        <p className="text-gray-600 text-center mb-8">
                            Select the repair service that best suits your needs
                        </p>

                        {/* Display uploaded photos if available */}
                        {photos && photos.length > 0 && (
                            <div className="mb-8">
                                <h3 className="font-bold mb-4">Uploaded Photos</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {photos.map((photoUrl, index) => (
                                        // Check if photoUrl is a valid string before rendering
                                        typeof photoUrl === 'string' && photoUrl.length > 0 ? (
                                            <img
                                                key={index}
                                                src={photoUrl}
                                                alt={`Uploaded ${index + 1}`}
                                                className="w-full h-auto rounded-lg object-cover aspect-square" // Added object-cover and aspect ratio
                                            />
                                        ) : null // Or a placeholder if URL is invalid
                                    ))}
                                </div>
                            </div>
                        )}


                        <form onSubmit={handleSubmit} className="space-y-8">
                            <RadioGroup
                                defaultValue="Basic" // Make sure this matches an option ID
                                value={selectedOption}
                                onValueChange={setSelectedOption}
                                className="grid gap-6"
                            >
                                {repairOptions.map((option) => (
                                    <div key={option.id} className="relative">
                                        <RadioGroupItem
                                            value={option.id}
                                            id={option.id}
                                            className="peer sr-only"
                                        />
                                        <Label
                                            htmlFor={option.id}
                                            className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-electric-blue peer-data-[state=checked]:bg-blue-50"
                                        >
                                            <div className="mb-4 md:mb-0">
                                                <h3 className="font-bold text-lg">{option.title}</h3>
                                                <p className="text-gray-600 text-sm">{option.description}</p> {/* Made description smaller */}
                                                <p className="text-xs text-gray-500">Processing time: {option.duration}</p> {/* Made duration smaller */}
                                            </div>
                                            <div className="font-bold text-2xl text-electric-blue">
                                                R{option.price.toFixed(2)}
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>

                            <div className="space-y-4">
                                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Tell us any specific details about your jersey repair..."
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    className="min-h-[120px]"
                                />
                            </div>

                            {selectedRepairOption && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold mb-2">Quote Summary</h3>
                                    <div className="flex justify-between mb-2">
                                        <span>Service:</span>
                                        <span>{selectedRepairOption.title}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span>Processing Time:</span>
                                        <span>{selectedRepairOption.duration}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                        <span>Total:</span>
                                        <span className="text-electric-blue">R{selectedRepairOption.price.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                {/* Navigate back to upload-photos, passing photos */}
                                <Button type="button" variant="outline" onClick={() => navigate('/upload-photos', { state: { photos: photos, orderId: orderId } })}>
                                    Back
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Continue to Scheduling
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

export default GetQuote;