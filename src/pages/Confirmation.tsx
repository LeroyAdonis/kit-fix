// src/pages/Confirmation.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, CreditCard, CalendarDays, MapPin, Tag, DollarSign, Hash, User, Mail, Phone } from 'lucide-react'; // Added more icons
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Use Shadcn Card
import { Separator } from '@/components/ui/separator'; // Use Shadcn Separator
import { Badge } from '@/components/ui/badge'; // Use Shadcn Badge
import { format } from 'date-fns'; // Import format for timestamps

// Import the Order type
import { Order } from '@/types/order';


const Confirmation = () => {
    const { orderId } = useParams<{ orderId: string }>(); // Specify type for useParams
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null); // Use the Order type
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Order ID from URL params:', orderId);

        if (!orderId) {
            setError('Missing order ID.'); // More concise error message
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                setLoading(true); // Ensure loading is true before fetch
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    // Cast fetched data to Order type
                    const orderData = orderSnap.data() as Order;

                    // Basic validation that essential data is present (optional but good)
                    if (!orderData.contactInfo || !orderData.processing || !orderData.payment) {
                        console.warn("Fetched order is missing essential data:", orderData);
                        setError('Order data is incomplete.');
                    } else {
                        setOrder(orderData);
                    }

                } else {
                    setError('Order not found.');
                }
            } catch (err) {
                console.error('Error fetching order:', err);
                setError('Failed to load order details.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
        // Add dependencies: orderId, db (if it can change, unlikely here)
    }, [orderId]);


    // Handle case where orderId is missing or error occurred before rendering JSX
    if (!orderId) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center text-center px-4">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                <p className="text-gray-700">Order ID is missing. Please return to the dashboard or home page.</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-6">Go to Dashboard</Button>
            </div>
        );
    }


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center text-center px-4">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Order</h1>
                <p className="text-gray-700 mb-6">{error || "Could not retrieve order details."}</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Return to Home</Button>
                </div>
            </div>
        );
    }

    // Safely access nested data using optional chaining
    const paymentStatus = order.payment?.status || 'N/A';
    const deliveryMethod = order.processing?.deliveryMethod || 'N/A';
    const repairType = order.repairDescription || order.repairType || 'N/A'; // Prefer description
    const amount = order.payment?.amount;
    const formattedAmount = amount !== undefined ? `R${amount.toFixed(2)}` : 'N/A';
    const preferredDate = order.processing?.preferredDate || 'N/A';
    const deliveryAddress = order.contactInfo?.address || 'N/A'; // Address is in contactInfo now
    const orderCreationDate =
        order.createdAt && typeof order.createdAt === "object" && "seconds" in order.createdAt
            ? format(new Date((order.createdAt as Timestamp).seconds * 1000), "dd MMM yyyy HH:mm")
            : 'N/A';

    // Determine the location/address to display based on method
    let locationLabel = 'Address/Location';
    let locationValue = 'N/A';
    if (deliveryMethod === 'delivery' && deliveryAddress !== 'N/A') {
        locationLabel = 'Delivery Address';
        locationValue = deliveryAddress;
    } else if (deliveryMethod === 'pickup' && order.processing?.pickupLocation) {
        locationLabel = 'Pickup Location';
        locationValue = order.processing.pickupLocation; // Use placeholder or actual saved value
    } else if (deliveryMethod === 'dropoff' && order.processing?.dropoffLocation) {
        locationLabel = 'Dropoff Location';
        locationValue = order.processing.dropoffLocation; // Use placeholder or actual saved value
    }


    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4 bg-gray-50"> {/* Added a light background */}
                <div className="container-custom max-w-2xl">
                    <Card className="shadow-xl border-electric-blue/50"> {/* Added subtle border */}
                        <CardHeader className="text-center">
                            <div className="flex flex-col items-center justify-center">
                                <CheckCircle className="w-16 h-16 text-lime-green mx-auto mb-4" /> {/* Slightly smaller icon */}
                                <CardTitle className="text-3xl font-bold text-electric-blue mb-2">Order Confirmed!</CardTitle> {/* Electric blue title */}
                            </div>
                            <p className="text-gray-700 text-lg">
                                Thank you for your order. Your jersey repair is now in process.
                            </p>
                        </CardHeader>
                        <Separator className="my-4" /> {/* Separator */}
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4 text-gray-700"> {/* Use grid for details */}
                                <div className="flex items-center gap-2">
                                    <Hash className="h-5 w-5 text-indigo-500" />
                                    <strong>Order #:</strong> {`KF${orderId.slice(0, 6).toUpperCase()}`}
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5 text-orange-500" />
                                    <strong>Order Date:</strong> {orderCreationDate}
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    <strong>Payment Status:</strong> <Badge variant="default" className="capitalize">{paymentStatus}</Badge> {/* Use Badge */}
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-lime-green" />
                                    <strong>Total Paid:</strong> {formattedAmount}
                                </div>
                                <div className="flex items-center gap-2 md:col-span-2"> {/* Span two columns */}
                                    <Tag className="h-5 w-5 text-blue-500" />
                                    <strong>Service:</strong> {repairType}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-gray-600" />
                                    <strong>Delivery Method:</strong> <span className="capitalize">{deliveryMethod}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5 text-purple-500" />
                                    <strong>Preferred Date:</strong> {preferredDate}
                                </div>

                                {/* Display Location/Address based on Method */}
                                {locationValue !== 'N/A' && (
                                    <div className="flex items-start gap-2 md:col-span-2"> {/* Span two columns */}
                                        <MapPin className="h-5 w-5 text-red-500 mt-1" /> {/* Align icon */}
                                        <strong>{locationLabel}:</strong> {locationValue}
                                    </div>
                                )}

                                {order.notes && (
                                    <div className="flex items-start gap-2 md:col-span-2"> {/* Span two columns */}
                                        <Package className="h-5 w-5 text-blue-500 mt-1" />
                                        <strong>Notes:</strong> <span className="break-words">{order.notes}</span> {/* Use break-words for long notes */}
                                    </div>
                                )}

                                {/* Add Contact Info Section */}
                                <Separator className="my-4 md:col-span-2" /> {/* Separator for contact info */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-700 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span>{order.contactInfo?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span>{order.contactInfo?.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span>{order.contactInfo?.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <Separator className="my-4" /> {/* Separator */}

                            <p className="text-gray-700 text-center">
                                We'll send you updates about your repair via email. You can also track the status in your account dashboard.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                                <Button onClick={() => navigate('/dashboard')}>
                                    Go to Dashboard
                                </Button>
                                <Button variant="outline" onClick={() => navigate('/')}>
                                    Return to Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Confirmation;