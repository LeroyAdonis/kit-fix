import React, { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import StatusFilter from "./StatusFilter";

type Order = {
    id: string;
    contactInfo?: {
        name: string;
        email: string;
        phone: string;
    };
    processing: {
        deliveryMethod: string;
        deliveryDate?: string;
        deliveryStatus?: string;
    };
};

const DeliveryManager = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        const fetchDeliveryOrders = async () => {
            try {
                const snapshot = await getDocs(collection(db, "orders"));
                const deliveryOrders = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() } as Order))
                    .filter(
                        (order) =>
                            order.processing?.deliveryMethod === "delivery" ||
                            (order.processing?.deliveryMethod === "pickup" &&
                                order.processing?.deliveryStatus) // 👈 means it has entered delivery phase
                    )



                setOrders(deliveryOrders);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching delivery orders:", error);
            }
        };

        fetchDeliveryOrders();
    }, []);

    const updateDelivery = async (
        orderId: string,
        field: keyof Order["processing"],
        value: string
    ) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, {
                [`processing.${field}`]: value,
            });

            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId
                        ? {
                            ...order,
                            processing: {
                                ...order.processing,
                                [field]: value,
                            },
                        }
                        : order
                )
            );
        } catch (error) {
            console.error("Error updating delivery info:", error);
        }
    };

    const filteredOrders =
        selectedStatus === "all"
            ? orders
            : orders.filter(
                (order) => order.processing?.deliveryStatus === selectedStatus
            );

    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <StatusFilter
                statuses={["scheduled", "out for delivery", "delivered"]}
                selectedStatus={selectedStatus}
                onChange={setSelectedStatus}
            />

            {filteredOrders.length === 0 && <p className="text-jet-black">No delivery orders found.</p>}

            {filteredOrders.map((order) => (
                <div
                    key={order.id}
                    className="p-4 border rounded-xl bg-white shadow-md space-y-2"
                >
                    <h3 className="font-semibold text-lg">{order.contactInfo?.name}</h3>
                    <p className="text-sm text-jet-black">
                        Phone: {order.contactInfo?.phone}
                    </p>
                    <p className="text-sm text-jet-black">
                        Email: {order.contactInfo?.email}
                    </p>

                    <div className="text-sm font-medium">
                        Delivery Date:{" "}
                        {order.processing?.deliveryDate
                            ? format(new Date(order.processing.deliveryDate), "PPP")
                            : "Not set"}
                    </div>

                    <div className="flex items-center gap-4">
                        <label>Status:</label>
                        <select
                            value={order.processing.deliveryStatus || "scheduled"}
                            onChange={(e) =>
                                updateDelivery(order.id, "deliveryStatus", e.target.value)
                            }
                            className="border rounded px-2 py-1"
                        >
                            <option value="scheduled">Scheduled</option>
                            <option value="out for delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                        </select>

                        <Button
                            onClick={() =>
                                updateDelivery(order.id, "deliveryStatus", "delivered")
                            }
                            variant="outline"
                        >
                            Mark as Delivered
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DeliveryManager;
