// ... existing imports remain unchanged
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { setDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { useToast } from "@/hooks/use-toast";
import { Form, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormProvider, useForm } from 'react-hook-form';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PaymentPage = () => {
    const publicKey = 'pk_test_47613641c497d46502f6efadf29ef3c821f7b459';
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const methods = useForm();
    const { setValue } = methods;
    const [user] = useAuthState(auth);
    const [isLoading, setIsLoading] = useState(false);
    const [finalOrderData, setFinalOrderData] = useState<any>(null);
    const [finalOrderId, setFinalOrderId] = useState<string | null>(null);

    useEffect(() => {
        const localOrderData = localStorage.getItem("kitfix-order");
        const localOrderId = localStorage.getItem("orderId");
        const localScheduleData = localStorage.getItem("scheduleData");

        const orderIdFromParams = searchParams.get("orderId");

        const baseData = localOrderData ? JSON.parse(localOrderData) : null;
        const scheduleData = localScheduleData ? JSON.parse(localScheduleData) : {};

        if (baseData) {
            const merged = { ...baseData, ...scheduleData };
            setFinalOrderData(merged);
            setFinalOrderId(orderIdFromParams || localOrderId || null);

            localStorage.setItem("orderData", JSON.stringify(merged));
            if (orderIdFromParams) {
                localStorage.setItem("orderId", orderIdFromParams);
            }
        } else {
            navigate(`/schedule-service?orderId=${orderIdFromParams}`);
        }
    }, [searchParams, navigate]);

    const markPaymentAsComplete = async (orderId: string) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
        });
    };

    const handlePaymentSuccess = async (reference: string) => {
        if (!user || !finalOrderId) {
            toast({ title: "Error", description: "User not authenticated" });
            return;
        }

        try {
            const processingData = {
                duration: finalOrderData.duration || "",
                deliveryMethod: finalOrderData.deliveryMethod || "",
                deliveryDate: finalOrderData.date ? Timestamp.fromDate(new Date(finalOrderData.date)) : null,
                preferredDate: finalOrderData.preferredDate,
                dropoffDate: finalOrderData.dropoffDate ? Timestamp.fromDate(new Date(finalOrderData.dropoffDate)) : null,
                pickupStatus: finalOrderData.deliveryMethod === "pickup" ? "awaiting_pickup" : null,
                dropoffStatus: finalOrderData.deliveryMethod === "dropoff" ? "awaiting_dropoff" : null,
                deliveryStatus: finalOrderData.deliveryMethod === "pickup" ? "awaiting_delivery" : null,
            };

            await updateDoc(doc(db, "orders", finalOrderId), {
                payment: {
                    amount: finalOrderData.price,
                    reference,
                    status: "paid",
                    method: "Paystack",
                    paidAt: Timestamp.now(),
                },
                processing: processingData,
                status: "paid",
                updatedAt: Timestamp.now(),
            });

            markPaymentAsComplete(finalOrderId);

            toast({ title: "Payment successful!", description: "Your order has been placed." });
            navigate(`/confirmation/${finalOrderId}`);
            localStorage.removeItem('orderData');
            localStorage.removeItem('orderId');
        } catch (error) {
            console.error("Error saving order:", error);
            toast({ title: "Something went wrong", description: "We couldn't save your order." });
        }
    };

    const handlePaystack = async () => {
        if (!finalOrderData || !user) {
            toast({ title: "Error", description: "You must be logged in to pay." });
            return;
        }

        try {
            setIsLoading(true);

            const newOrder = {
                userId: user.uid,
                contactInfo: {
                    name: finalOrderData.name,
                    email: finalOrderData.email,
                    phone: finalOrderData.phone,
                    address: finalOrderData.deliveryAddress || "",
                },
                repairDetails: {
                    type: finalOrderData.selectedOption?.label || finalOrderData.repairType || "",
                    price: finalOrderData.selectedOption?.price || finalOrderData.price || 0,
                    description: finalOrderData.selectedOption?.description || "",
                    additionalNotes: finalOrderData.additionalNotes || finalOrderData.notes || "",
                },
                processing: {
                    duration: finalOrderData.duration || "",
                    deliveryMethod: finalOrderData.deliveryMethod || "",
                    deliveryDate: finalOrderData.date ? Timestamp.fromDate(new Date(finalOrderData.date)) : null,
                },
                payment: {
                    amount: finalOrderData.price || 0,
                    status: "pending",
                    method: null,
                    reference: null,
                    paidAt: null,
                },
                status: "pending",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            let orderId = finalOrderId;

            if (!orderId) {
                const docRef = doc(collection(db, "orders"));
                await setDoc(docRef, newOrder);
                orderId = docRef.id;
                setFinalOrderId(orderId);
                localStorage.setItem("orderId", orderId);
            }

            const paystack = (window as any).PaystackPop.setup({
                key: publicKey,
                email: finalOrderData.email,
                amount: finalOrderData.price * 100,
                currency: "ZAR",
                metadata: {
                    name: finalOrderData.name,
                    phone: finalOrderData.phone,
                    email: finalOrderData.email,
                    address: finalOrderData.deliveryAddress,
                    repairType: finalOrderData.repairType || "",
                    deliveryMethod: finalOrderData.deliveryMethod,
                    processingTime: finalOrderData.duration,
                    additionalNotes: finalOrderData.additionalNotes || finalOrderData.notes,
                },
                callback: (response: any) => {
                    handlePaymentSuccess(response.reference);
                    setIsLoading(false);
                },
                onClose: () => {
                    toast({ variant: "destructive", title: "Payment cancelled" });
                    setIsLoading(false);
                },
            });

            paystack.openIframe();
        } catch (error) {
            console.error("Error initiating payment:", error);
            toast({ title: "Failed", description: "Could not start payment. Try again." });
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFinalOrderData((prev: any) => {
            const updated = {
                ...prev,
                [field]: value
            };

            if (field === "repairType") {
                updated.selectedOption = { ...prev.selectedOption, label: value };
            }

            localStorage.setItem("kitfix-order", JSON.stringify(updated));
            return updated;
        });
    };

    if (!finalOrderData) {
        return <div>Order data is missing.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
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
                            <p className="text-muted-foreground text-jet-black">Review your details before proceeding to payment.</p>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6 space-y-6">
                            <FormProvider {...methods}>
                                <Form {...methods}>
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Form Fields */}
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        {finalOrderData.deliveryMethod === 'pickup' && (
                                            <FormItem>
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    <Input value={finalOrderData.deliveryAddress || ''} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} />
                                                </FormControl>
                                            </FormItem>
                                        )}

                                        <FormItem>
                                            <FormLabel>Repair Type</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.repairType || finalOrderData.selectedOption?.label || ''} onChange={(e) => handleInputChange('repairType', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        <FormItem>
                                            <FormLabel>Processing Time</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.duration || ''} onChange={(e) => handleInputChange('duration', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        <FormItem>
                                            <FormLabel>Additional Notes</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} />
                                            </FormControl>
                                        </FormItem>

                                        <FormItem>
                                            <FormLabel>Delivery Method</FormLabel>
                                            <FormControl>
                                                <Input value={finalOrderData.deliveryMethod || ''} onChange={(e) => handleInputChange('deliveryMethod', e.target.value)} />
                                            </FormControl>
                                        </FormItem>
                                    </div>
                                </Form>
                            </FormProvider>
                            <Button className="w-full mt-6" onClick={handlePaystack} disabled={isLoading}>
                                {isLoading ? "Processing..." : "Pay Now"}
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
