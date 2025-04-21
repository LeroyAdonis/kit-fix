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
        dropoffDate?: string;
        dropoffStatus?: string;
    };
};

const DropoffManager = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        const fetchDropoffs = async () => {
            const snapshot = await getDocs(collection(db, "orders"));
            const dropoffOrders = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() } as Order))
                .filter((order) => order.processing?.deliveryMethod === "dropoff");

            setOrders(dropoffOrders);
            setLoading(false);
        };

        fetchDropoffs();
    }, []);

    const updateDropoff = async (
        orderId: string,
        field: keyof Order["processing"],
        value: string
    ) => {
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
    };

    const filteredOrders =
        selectedStatus === "all"
            ? orders
            : orders.filter(
                (order) => order.processing?.dropoffStatus === selectedStatus
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
                statuses={["received", "in repair", "ready for pickup"]}
                selectedStatus={selectedStatus}
                onChange={setSelectedStatus}
            />

            {filteredOrders.length === 0 && <p className="text-gray-600">No dropoff orders found.</p>}

            {filteredOrders.map((order) => (
                <div
                    key={order.id}
                    className="p-4 border rounded-xl bg-white shadow-md space-y-2"
                >
                    <h3 className="font-semibold text-xl">{order.contactInfo?.name}</h3>
                    <p className="text-sm text-gray-600">
                        Phone: {order.contactInfo?.phone}
                    </p>
                    <p className="text-sm text-gray-600">
                        Email: {order.contactInfo?.email}
                    </p>

                    <div className="text-sm font-medium">
                        Dropoff Date:{" "}
                        {order.processing?.dropoffDate
                            ? format(new Date(order.processing.dropoffDate), "PPP")
                            : "Not set"}
                    </div>

                    <div className="flex items-center gap-4">
                        <label>Status:</label>
                        <select
                            value={order.processing.dropoffStatus || "received"}
                            onChange={(e) =>
                                updateDropoff(order.id, "dropoffStatus", e.target.value)
                            }
                            className="border rounded px-2 py-1"
                        >
                            <option value="received">Received</option>
                            <option value="in repair">In Repair</option>
                            <option value="ready for pickup">Ready for Pickup</option>
                        </select>
                        <Button
                            onClick={() =>
                                updateDropoff(order.id, "dropoffStatus", "ready for pickup")
                            }
                            variant="outline"
                        >
                            Mark as Ready
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DropoffManager;
