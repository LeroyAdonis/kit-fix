import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrdersTable from "./components/OrdersTable";
import PickupScheduler from "./components/PickupScheduler";
import DeliveryManager from "./components/DeliveryManager";
import DropoffManager from "./components/DropoffManager";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AdminDashboard = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 mt-15">
            <Header admin />

            <main className="flex-grow container-custom glass-card xl:mx-20 sm:mx-4 md:mx-10 lg:mx-20 my-10 rounded-2xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-jet-black mb-8">KitFix Admin Dashboard</h1>

                <Tabs defaultValue="orders" className="w-full">
                    <TabsList className="flex gap-4 mb-6">
                        <TabsTrigger
                            value="orders"
                            className="btn-success rounded-xl px-4 py-2 font-medium bg-lime-green text-white hover:bg-lime-500 transition data-[state=active]:ring-2 data-[state=active]:underline underline-offset-4"
                        >
                            Orders
                        </TabsTrigger>
                        <TabsTrigger
                            value="pickup"
                            className="btn-warning rounded-xl px-4 py-2 font-medium data-[state=active]:underline underline-offset-4"
                        >
                            Pickups
                        </TabsTrigger>
                        <TabsTrigger
                            value="delivery"
                            className="btn-primary rounded-xl px-4 py-2 font-medium data-[state=active]:underline underline-offset-4"
                        >
                            Deliveries
                        </TabsTrigger>
                        <TabsTrigger
                            value="dropoff"
                            className="btn-danger rounded-xl px-4 py-2 font-medium bg-red-500 text-white hover:bg-red-700 transition data-[state=active]:underline underline-offset-4"
                        >
                            Dropoffs
                        </TabsTrigger>

                    </TabsList>

                    <TabsContent value="orders">
                        <Card className="rounded-xl bg-white shadow-md mb-8">
                            <CardContent className="p-6">
                                <OrdersTable />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pickup">
                        <Card className="rounded-xl bg-white shadow-md mb-8">
                            <CardContent className="p-6">
                                <PickupScheduler />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="delivery">
                        <Card className="rounded-xl bg-white shadow-md mb-8">
                            <CardContent className="p-6">
                                <DeliveryManager />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="dropoff">
                        <Card className="rounded-xl bg-white shadow-md mb-8">
                            <CardContent className="p-6">
                                <DropoffManager />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;

