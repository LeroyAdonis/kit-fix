"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var OrdersTable_1 = require("./components/OrdersTable");
var PickupScheduler_1 = require("./components/PickupScheduler");
var DeliveryManager_1 = require("./components/DeliveryManager");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var AdminDashboard = function () {
    return (<div className="min-h-screen flex flex-col bg-gray-50 mt-15">
            <Header_1.default admin/>

            <main className="flex-grow container-custom glass-card xl:mx-20 sm:mx-4 md:mx-10 lg:mx-20 my-10 rounded-2xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-jet-black mb-8">KitFix Admin Dashboard</h1>

                <tabs_1.Tabs defaultValue="orders" className="w-full">
                    <tabs_1.TabsList className="flex gap-4 mb-6">
                        <tabs_1.TabsTrigger value="orders" className="rounded-xl px-4 py-2 font-medium bg-lime-green text-white hover:bg-lime-700 transition data-[state=active]:ring-2 data-[state=active]:ring-lime-400">
                            Orders
                        </tabs_1.TabsTrigger>
                        <tabs_1.TabsTrigger value="pickup" className="rounded-xl px-4 py-2 font-medium bg-fiery-red text-white hover:bg-red-700 transition data-[state=active]:ring-2 data-[state=active]:ring-red-400">
                            Pickups
                        </tabs_1.TabsTrigger>
                        <tabs_1.TabsTrigger value="delivery" className="rounded-xl px-4 py-2 font-medium bg-electric-blue text-white hover:bg-blue-700 transition data-[state=active]:ring-2 data-[state=active]:ring-blue-400">
                            Deliveries
                        </tabs_1.TabsTrigger>
                    </tabs_1.TabsList>

                    <tabs_1.TabsContent value="orders">
                        <card_1.Card className="rounded-xl bg-white shadow-md mb-8">
                            <card_1.CardContent className="p-6">
                                <OrdersTable_1.default />
                            </card_1.CardContent>
                        </card_1.Card>
                    </tabs_1.TabsContent>

                    <tabs_1.TabsContent value="pickup">
                        <card_1.Card className="rounded-xl bg-white shadow-md mb-8">
                            <card_1.CardContent className="p-6">
                                <PickupScheduler_1.default />
                            </card_1.CardContent>
                        </card_1.Card>
                    </tabs_1.TabsContent>

                    <tabs_1.TabsContent value="delivery">
                        <card_1.Card className="rounded-xl bg-white shadow-md mb-8">
                            <card_1.CardContent className="p-6">
                                <DeliveryManager_1.default />
                            </card_1.CardContent>
                        </card_1.Card>
                    </tabs_1.TabsContent>
                </tabs_1.Tabs>
            </main>

            <Footer_1.default />
        </div>);
};
exports.default = AdminDashboard;
