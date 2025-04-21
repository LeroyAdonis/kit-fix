// src/admin/components/OrdersTable.tsx

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const OrdersTable = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const ordersRef = collection(db, "orders");
                // const q = query(ordersRef);
                const q = query(ordersRef, orderBy("updatedAt", "desc"));
                const snapshot = await getDocs(q);
                const orderData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setOrders(orderData);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return <p className="text-gray-500 text-center">No orders found.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
            <table className="min-w-full bg-white text-sm">
                <thead className=" text-left text-xs font-semibold uppercase text-gray-600">
                    <tr className="border-b">
                        <th className="p-3">Customer</th>
                        <th className="p-3">Repair Type</th>
                        <th className="p-3">Repair Description</th>
                        <th className="p-3">Additional Notes</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Payment reference</th>
                        <th className="p-3">Date</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {orders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                                {order.contactInfo?.name || "N/A"}<br />
                                <span className="text-xs text-gray-500">{order.contactInfo?.email}</span>
                            </td>
                            <td className="p-3">{order.repairType || "N/A"}</td>
                            <td className="p-3">{order.repairDescription || "N/A"}</td>
                            <td className="p-3">{order.notes || "N/A"}</td>
                            <td className="p-3">
                                <Badge variant="outline" className="capitalize">
                                    {order.processing?.status || "Pending"}
                                </Badge>
                            </td>
                            <td className="p-3">
                                <Badge variant={order.payment?.paid ? "default" : "destructive"}>
                                    {order.status ? "Paid" : "Unpaid"}
                                </Badge>
                            </td>
                            <td className="p-3">
                                <Badge variant={order.payment?.reference ? "default" : "destructive"}>
                                    {order.payment?.status ? order.payment?.reference || "N/A" : "N/A"}
                                </Badge>
                            </td>
                            <td className="p-3">
                                {order.updatedAt?.seconds
                                    ? format(new Date(order.updatedAt.seconds * 1000), "d MMM yyyy")
                                    : "N/A"}
                                {/* {order.createdAt?.seconds
                                    ? format(new Date(order.createdAt.seconds * 1000), "d MMM yyyy")
                                    : "N/A"} */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersTable;
