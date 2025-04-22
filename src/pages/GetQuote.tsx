import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { set } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from '@/firebaseConfig';


const auth = getAuth();
const userId = auth.currentUser?.uid;



type RepairOption = {
    id: string;
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
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [orderId, setOrderId] = useState(() => {
        return (
            searchParams.get('orderId') ||
            location.state?.orderId ||
            (userId ? localStorage.getItem(`kitfix-${userId}-order-id`) : undefined)
        );
    });

    useEffect(() => {
        const checkIfQuoteStepIsDone = async () => {
            if (!orderId) return;

            try {
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();

                    // Redirect if quote is already completed
                    if (orderData.stepCompleted === 'quote') {
                        navigate(`/schedule-service?orderId=${orderId}`);
                        // navigate('/schedule-service', {
                        //     state: {
                        //         orderId,
                        //         photos: orderData.photos || [],
                        //         selectedOption: orderData.repairType,
                        //         price: orderData.price,
                        //         duration: orderData.duration,
                        //         notes: orderData.notes || "",
                        //         description: orderData.repairDescription || ""
                        //     }
                        // });
                    }
                }
            } catch (error) {
                console.error("Error checking order step:", error);
            }
        };

        checkIfQuoteStepIsDone();
    }, [orderId, navigate]);



    const [photos, setPhotos] = useState(() => {
        const stored = userId ? localStorage.getItem(`kitfix-${userId}-quote-photos`) : null;
        return stored ? JSON.parse(stored) : [];
    });


    const [selectedOption, setSelectedOption] = useState(() => {
        return userId ? localStorage.getItem(`kitfix-${userId}-quote-repairType`) || "Basic" : "Basic";
    });


    const [additionalNotes, setAdditionalNotes] = useState(() => {
        return userId ? localStorage.getItem(`kitfix-${userId}-quote-notes`) || "" : "";
    });

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            }
        };

        // const fetchOrders = async () => {
        //     if (user) {
        //         const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        //         const querySnapshot = await getDocs(q);
        //         const ordersList = querySnapshot.docs.map(doc => {
        //             console.log("Fetched order:", doc.id, doc.data());
        //             return { id: doc.id, ...doc.data() };
        //         });
        //         setOrders(ordersList);
        //     }
        // };

        fetchUserData();
        // fetchOrders();
    }, [user]);



    useEffect(() => {
        if (photos) {
            console.log('Received photos:', photos);
        }
    }, [photos]);

    useEffect(() => {
        if (userId) {
            localStorage.setItem(`kitfix-${userId}-order-id`, orderId);
        }
    }, [orderId]);

    useEffect(() => {
        if (userId) {
            localStorage.setItem(`kitfix-${userId}-quote-photos`, JSON.stringify(photos));
        }
    }, [photos]);


    useEffect(() => {
        if (userId) {
            localStorage.setItem(`kitfix-${userId}-quote-repairType`, selectedOption);
        }
    }, [selectedOption]);

    useEffect(() => {
        if (userId) {
            localStorage.setItem(`kitfix-${userId}-quote-notes`, additionalNotes);
        }
    }, [additionalNotes]);





    const handleSubmit = async (e: React.FormEvent) => {
        setIsLoading(true);
        e.preventDefault();

        if (!selectedOption) {
            toast.error('Please select a repair option');
            return;
        }

        const selectedRepairOption = repairOptions.find(option => option.id === selectedOption);
        if (!selectedRepairOption) {
            toast.error('Invalid repair option selected');
            return;
        }

        if (!orderId) {
            toast.error("Order ID not found. Please restart your repair.");
            return;
        }

        try {
            const db = getFirestore();
            const orderRef = doc(db, "orders", orderId);

            await updateDoc(orderRef, {
                repairType: selectedOption,
                repairDescription: selectedRepairOption.description,
                price: selectedRepairOption.price,
                notes: additionalNotes,
                stepCompleted: "quote",
                processing: {
                    duration: selectedRepairOption.duration
                }
            });

            setIsLoading(false);

            toast.success('Quote saved. Proceeding to scheduling.');

            const quoteData = {
                orderId,
                photos,
                selectedOption,
                price: selectedRepairOption.price,
                duration: selectedRepairOption.duration,
                notes: additionalNotes,
                description: selectedRepairOption.description
            };

            localStorage.setItem("kitfix-quote-data", JSON.stringify(quoteData));

            navigate(`/schedule-service?orderId=${orderId}`);
        } catch (error) {
            setIsLoading(false);
            console.error("Error updating order:", error);
            toast.error("Something went wrong while saving your quote.");
        }
    };

    const selectedRepairOption = repairOptions.find(option => option.id === selectedOption);

    if (!userData && isLoading == true) {
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

                        {/* {photos && (
                            <div className="mb-8">
                                <h3 className="font-bold mb-4">Uploaded Photos</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {photos.map((photo, index) => (
                                        <img
                                            key={index}
                                            src={photo}
                                            alt={`Uploaded ${index + 1}`}
                                            className="w-full h-auto rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        )} */}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <RadioGroup
                                defaultValue="Basic"
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
                                                <p className="text-gray-600">{option.description}</p>
                                                <p className="text-sm text-gray-500">Processing time: {option.duration}</p>
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
                                <Button type="button" variant="outline" onClick={() => navigate('/upload-photos')}>
                                    Back
                                </Button>
                                <Button type="submit">
                                    Schedule Service
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
