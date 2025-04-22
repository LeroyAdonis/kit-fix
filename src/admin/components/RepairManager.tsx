import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RepairManager = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const q = query(
                collection(db, "orders"),
                where("status", "==", "in-progress"),
                where("stepCompleted", "==", "schedule"),
                // orderBy("updatedAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedOrders = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setOrders(fetchedOrders);
        } catch (error) {
            console.error("Error fetching repair orders:", error);
            toast.error("Failed to load repair queue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStartRepair = async (orderId: string) => {
        try {
            const ref = doc(db, "orders", orderId);
            await updateDoc(ref, {
                repairProgress: {
                    status: "started",
                    startedAt: new Date().toISOString(),
                },
            });
            toast.success("Marked as 'Repair Started'");
            fetchOrders();
        } catch (error) {
            console.error("Start repair error:", error);
            toast.error("Failed to update repair status");
        }
    };

    const handleCompleteRepair = async (order: any) => {
        try {
            const ref = doc(db, "orders", order.id);
            const updated = {
                repairProgress: {
                    ...order.repairProgress,
                    status: "completed",
                    completedAt: new Date().toISOString(),
                },
                stepCompleted: "repair-completed",
            };

            await updateDoc(ref, updated);
            toast.success("Repair marked as completed");

            // Optional: trigger email notification or move to DeliveryManager
            // You can filter on the admin dashboard using `stepCompleted === "repair-completed"`

            fetchOrders();
        } catch (error) {
            console.error("Complete repair error:", error);
            toast.error("Failed to complete repair");
        }
    };

    if (loading) return <p className="p-4">Loading repairs...</p>;

    if (orders.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">No repairs in progress</div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold mb-4">Repair Queue</h2>
            {orders.map((order) => {
                const contact = order.contactInfo || {};
                const repair = order.repairProgress || {};
                return (
                    <Card key={order.id}>
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">
                                        {contact.name} - {contact.phone}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {order.repairType || "No repair type"}
                                    </p>
                                    <p className="text-sm">
                                        Method: <span className="capitalize">{order.processing?.deliveryMethod}</span>
                                    </p>
                                </div>
                                <div>
                                    {repair.status === "completed" ? (
                                        <span className="text-green-600 font-medium">Repair Completed</span>
                                    ) : repair.status === "started" ? (
                                        <Button onClick={() => handleCompleteRepair(order)}>
                                            Mark as Completed
                                        </Button>
                                    ) : (
                                        <Button onClick={() => handleStartRepair(order.id)}>
                                            Start Repair
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {repair.status && (
                                <div className="text-xs text-gray-500">
                                    {repair.status === "started" && repair.startedAt && (
                                        <>Started at: {new Date(repair.startedAt).toLocaleString()}</>
                                    )}
                                    {repair.status === "completed" && repair.completedAt && (
                                        <>Completed at: {new Date(repair.completedAt).toLocaleString()}</>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default RepairManager;
