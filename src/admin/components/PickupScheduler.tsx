import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
        pickupDate?: string;
        pickupStatus?: string;
    };
};

const PickupScheduler = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        const fetchPickupOrders = async () => {
            try {
                const snapshot = await getDocs(collection(db, "orders"));
                const pickupOrders = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() } as Order))
                    .filter(
                        (order) =>
                            order.processing?.deliveryMethod === "pickup" &&
                            order.processing?.pickupStatus !== "picked"
                    );

                setOrders(pickupOrders);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching pickup orders:", error);
            }
        };

        fetchPickupOrders();
    }, []);

    const updatePickup = async (
        orderId: string,
        field: string,
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
                                deliveryStatus: value === "picked" ? "scheduled" : order.processing.deliveryStatus,
                            },
                        }
                        : order
                )
            );


            if (field === "pickupStatus") {
                const name =
                    orders.find((order) => order.id === orderId)?.contactInfo?.name ||
                    "Customer";
                if (value === "scheduled") {
                    toast.success(`Pickup scheduled for ${name}`);
                } else if (value === "picked") {
                    await updateDoc(orderRef, {
                        [`processing.${field}`]: value,
                        "processing.deliveryStatus": "scheduled", // 👈 Add this line
                    });
                    toast.success(`Jersey picked up for ${name}. Sent to Delivery Manager.`);
                }

            }
        } catch (error) {
            console.error("Error updating pickup info:", error);
        }
    };

    const filteredOrders =
        selectedStatus === "all"
            ? orders
            : orders.filter(
                (order) => order.processing?.pickupStatus === selectedStatus
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
                statuses={["pending", "scheduled", "picked"]}
                selectedStatus={selectedStatus}
                onChange={setSelectedStatus}
            />

            {filteredOrders.length === 0 && (
                <p className="text-md text-jet-black">No pickup orders found.</p>
            )}

            {filteredOrders.map((order) => (
                <div
                    key={order.id}
                    className="p-4 border rounded-xl bg-white shadow-md space-y-2"
                >
                    <h3 className="font-semibold text-xl">
                        {order.contactInfo?.name || "Unnamed"}
                    </h3>
                    <p className="text-sm text-jet-black">
                        Email: {order.contactInfo?.email}
                    </p>
                    <p className="text-sm text-jet-black">
                        Phone: {order.contactInfo?.phone}
                    </p>

                    <div className="flex gap-4 items-center mb-2 w-full sm:w-1/2">
                        <Label htmlFor={`pickupDate-${order.id}`}>Pickup Date:</Label>
                        <Input
                            id={`pickupDate-${order.id}`}
                            type="date"
                            value={
                                order.processing.pickupDate
                                    ? format(new Date(order.processing.pickupDate), "yyyy-MM-dd")
                                    : ""
                            }
                            onChange={(e) =>
                                updatePickup(order.id, "pickupDate", e.target.value)
                            }
                        />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <Label htmlFor={`pickupStatus-${order.id}`}>Status:</Label>
                        <select
                            id={`pickupStatus-${order.id}`}
                            value={order.processing.pickupStatus || "pending"}
                            onChange={(e) =>
                                updatePickup(order.id, "pickupStatus", e.target.value)
                            }
                            className="border rounded px-3 py-1 hover:bg-accent transition-colors"
                        >
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="picked">Picked</option>
                        </select>

                        <Button
                            variant="outline"
                            onClick={() =>
                                updatePickup(order.id, "pickupStatus", "scheduled")
                            }
                        >
                            Set as Scheduled
                        </Button>

                        <Button
                            className="bg-electric-blue text-white"
                            onClick={() => updatePickup(order.id, "pickupStatus", "picked")}
                        >
                            Mark as Picked
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PickupScheduler;
