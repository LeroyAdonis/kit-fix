import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { logoutUser } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { format } from "date-fns";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    BadgeCheck,
    Clock,
    Shirt,
    CalendarDays,
    Truck,
    CreditCard,
    Info,
} from "lucide-react";
import OrderImageCarousel from "@/components/OrderImageCarousel";
import ProgressStepper from "@/components/ProgressStepper";
import RepairTimeline from '@/components/RepairTimeline';

const Dashboard = () => {
    const [user, loading] = useAuthState(auth);
    const [userData, setUserData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const navigate = useNavigate();

    const safeFormatDate = (timestamp: any) => {
        if (timestamp && timestamp.seconds) {
            return format(new Date(timestamp.seconds * 1000), "d MMM yyyy");
        }
        return 'Unknown';
    };

    useEffect(() => {
        if (!user && !loading) {
            logoutUser();
        }
    }, [user, loading]);

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

        const fetchOrders = async () => {
            if (user) {
                const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                const ordersList = querySnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
                setOrders(ordersList);
            }
        };

        fetchUserData();
        fetchOrders();
    }, [user]);

    const logout = async () => {
        await logoutUser();
        navigate("/login");
    };

    const cancelOrder = async (orderId: string) => {
        if (window.confirm('Are you sure you want to cancel this order?')) {
            try {
                await deleteDoc(doc(db, 'orders', orderId));
                setOrders(orders.filter(order => order.id !== orderId));
                toast.success("Order cancelled successfully!");
            } catch (error) {
                console.error("Error cancelling order:", error);
                toast.error("Error cancelling order. Try again later.");
            }
        }
    };

    const getSteps = (deliveryMethod: string) => {
        if (deliveryMethod === 'pickup') {
            return [
                'Order Received',
                'Waiting for Pickup',
                'In Progress',
                'Delivered',
            ];
        } else if (deliveryMethod === 'dropoff') {
            return [
                'Order Received',
                'Waiting for Dropoff',
                'In Progress',
                'Delivered',
            ];
        } else {
            return ['Order Received', 'Processing', 'In Progress', 'Delivered'];
        }
    };

    const getCurrentStep = (processing: any) => {
        if (!processing) return 0;

        const { deliveryMethod, pickupStatus, dropoffStatus, deliveryStatus } = processing;

        if (deliveryMethod === 'pickup') {
            if (deliveryStatus === 'Delivered') return 3;
            if (pickupStatus === 'Picked up') return 2;
            return 1;
        }

        if (deliveryMethod === 'dropoff') {
            if (deliveryStatus === 'Delivered') return 3;
            if (dropoffStatus === 'Dropped off') return 2;
            return 1;
        }

        return 0;
    };

    if (!userData) {
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
                <div className="container-custom">
                    <div className="glass-card p-8 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="heading-lg">Welcome, {userData.name || 'User'}</h1>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h2 className="heading-sm">Your Information</h2>
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-gray-700"><strong>Name:</strong> {userData.name}</p>
                                    <p className="text-gray-700"><strong>Email:</strong> {userData.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="heading-sm">Start a New Repair</h2>
                                <p className="text-gray-700 mb-4">
                                    Ready to get your jersey fixed? Start the repair process now.
                                </p>
                                <Link to="/upload-photos">
                                    <Button className="sm:w-full md:w-1/2 mt-4 ">Start New Repair</Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <h2 className="heading-sm mb-6">Your Repair History</h2>
                        {orders.length === 0 ? (
                            <div className="bg-background rounded-lg p-8 text-center">
                                <p className="text-gray-700 mb-4">You don't have any repair history yet.</p>
                                <Link to="/upload-photos">
                                    <Button variant="outline">Start Your First Repair</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {orders.map((order) => {
                                    const paid = order.payment?.status === "paid";
                                    const deliveryType = order.processing?.deliveryMethod;
                                    const formattedDate = order.orderDate
                                        ? format(order.orderDate.toDate(), "dd MMM yyyy")
                                        : "N/A";
                                    const deliveryDate = order.processing?.deliveryDate || "Unknown";

                                    return (
                                        <Dialog key={order.id}>
                                            <DialogTrigger asChild>
                                                <Card className={`cursor-pointer transition hover:shadow-lg hover:border-electric-blue`}>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center justify-between">
                                                            <span className="text-base font-semibold text-electric-blue">
                                                                #{`KF${order.id.slice(0, 6).toUpperCase()}`}
                                                            </span>
                                                            {paid ? (
                                                                <BadgeCheck className="text-green-500" />
                                                            ) : (
                                                                <Clock className="text-yellow-500" />
                                                            )}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Shirt className="h-4 w-4" />
                                                            <span>{order.repairType.slice(0, 10) || "Repair"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <CreditCard className="h-4 w-4" />
                                                            <span>{paid ? "Paid" : "Pending Payment"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Truck className="h-4 w-4" />
                                                            <span>{deliveryType === "pickup" ? "Pickup" : "Dropoff"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <CalendarDays className="h-4 w-4" />
                                                            <span>{formattedDate}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </DialogTrigger>

                                            <DialogContent className="overflow-y-auto max-h-[80vh] p-4 sm:p-6 md:p-8">
                                                <DialogHeader>
                                                    <DialogTitle>Order #{`KF${order.id.slice(0, 6).toUpperCase()}`}</DialogTitle>
                                                    <DialogDescription>
                                                        Full repair and delivery details
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <ProgressStepper
                                                    steps={getSteps(order.processing?.deliveryMethod)}
                                                    currentStep={getCurrentStep(order.processing)}
                                                />
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Shirt className="h-4 w-4 text-muted-foreground" />
                                                        <strong>Repair Type:</strong> {order.repairType.slice(0, 10) || "Repair"}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="h-4 w-4 text-muted-foreground" />
                                                        <strong>Delivery Method:</strong> {deliveryType}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                                        <strong>{deliveryType === "pickup" ? "Pickup" : "Dropoff"} Date:</strong> {order.processing?.preferredDate || deliveryDate}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <strong>Duration:</strong> {order.duration || "Unknown"}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                        <strong>Paid:</strong> {paid ? "Yes" : "No"}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                        <strong>Status:</strong> {order.status || "Processing"}
                                                    </div>
                                                    {order.allImages?.length > 0 && (
                                                        <>
                                                            <OrderImageCarousel images={order.allImages} />
                                                            <RepairTimeline order={order} />
                                                        </>
                                                    )}
                                                </div>

                                                {!paid && (
                                                    <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                                                        <Link to={`/get-quote?orderId=${order.id}`} className="w-full">
                                                            <Button className="w-full btn-primary">Continue Repair</Button>
                                                        </Link>
                                                        <Button
                                                            variant="destructive"
                                                            className="w-30 btn-secondary"
                                                            onClick={() => cancelOrder(order.id)}
                                                        >
                                                            Cancel Order
                                                        </Button>
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Dashboard;

