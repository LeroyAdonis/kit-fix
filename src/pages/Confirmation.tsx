import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Confirmation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<{ processing: any; payment: any; customer: any; id: string; createdAt: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Order ID from URL params:', orderId);

        if (!orderId) {
            setError('Missing or invalid order ID from URL.');
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    setOrder(orderSnap.data() as any);
                } else {
                    setError('Order not found.');
                }
            } catch (err) {
                console.error('Error fetching order:', err);
                setError('Failed to load order.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Loading your order...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    const repairType = order?.processing?.repairType || 'Standard Repair';
    const paymentStatus = order?.payment?.status || 'Pending';
    const deliveryMethod = order?.processing?.deliveryMethod || 'pickup';
    const deliveryAddress = order?.processing?.deliveryAddress || '';
    const amount = order?.payment?.amount?.toFixed(2) || '0.00';

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-2xl">
                    <div className="glass-card p-8 text-center">
                        <CheckCircle className="w-20 h-20 text-lime-green mx-auto mb-6" />

                        <h1 className="heading-lg mb-4">Order Confirmed!</h1>
                        <p className="text-gray-600 text-xl mb-6">
                            Thank you for your order. Your jersey repair is now in process.
                        </p>

                        <div className="bg-blue-50 p-6 rounded-lg mb-8">
                            <h2 className="heading-sm mb-4">Order Details</h2>

                            <div className="grid md:grid-cols-2 gap-4 text-left">
                                <div>
                                    <p className="text-gray-500">Order Number:</p>
                                    <p className="font-bold text-jet-black"> {`KF${orderId?.slice(0, 6).toUpperCase()}`}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status:</p>
                                    <p className="font-bold text-lime-green capitalize">{paymentStatus}</p>
                                </div>

                                {deliveryMethod === 'pickup' && (
                                    <div>
                                        <p className="text-gray-500">Delivery Address:</p>
                                        <p className="font-bold text-jet-black">{deliveryAddress}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-500">Service:</p>
                                    <p className="font-bold text-jet-black">{repairType}</p>
                                </div>

                                <div>
                                    <p className="text-gray-500">Delivery Method:</p>
                                    <p className="font-bold capitalize text-jet-black">{deliveryMethod}</p>
                                </div>

                                <div>
                                    <p className="text-gray-500">Total Paid:</p>
                                    <p className="font-bold text-jet-black">${amount}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-gray-700">
                                We'll send you updates about your repair via email. You can also check the status in your account dashboard.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button onClick={() => navigate('/dashboard')}>
                                    Go to Dashboard
                                </Button>
                                <Button variant="outline" onClick={() => navigate('/')}>
                                    Return to Home
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Confirmation;
