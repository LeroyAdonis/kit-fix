import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OrdersTable from "./components/OrdersTable";
import RepairManager from "./components/RepairManager";
import PickupScheduler from "./components/PickupScheduler";
import DeliveryManager from "./components/DeliveryManager";
import DropoffManager from "./components/DropoffManager";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClipboardList, Wrench, Truck, Package, Store } from "lucide-react";

const NAV_TABS = [
    { key: 'orders', label: 'Orders', icon: ClipboardList },
    { key: 'repairs', label: 'Repairs', icon: Wrench },
    { key: 'pickups', label: 'Pickups', icon: Truck },
    { key: 'deliveries', label: 'Deliveries', icon: Package },
    { key: 'dropoffs', label: 'Dropoffs', icon: Store },
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders');
    const navRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const updateIndicator = () => {
            if (!navRef.current) return;
            const btns = navRef.current.querySelectorAll<HTMLButtonElement>(".admin-segmented-nav-btn");
            const idx = NAV_TABS.findIndex(tab => tab.key === activeTab);
            if (btns[idx]) {
                const btn = btns[idx];
                setIndicatorStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
            }
        };
        updateIndicator();
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [activeTab]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 mt-15">
            <Header />
            <main className="flex-grow container-custom glass-card xl:mx-20 sm:mx-4 md:mx-10 lg:mx-20 my-10 rounded-2xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-jet-black mb-8">KitFix Admin Dashboard</h1>
                <div className="flex justify-center mb-8">
                    <div
                        className="admin-segmented-nav"
                        ref={navRef}
                        style={{ minWidth: 280 }}
                    >
                        <div
                            className="admin-segmented-nav-indicator justify-between"
                            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                        />
                        {NAV_TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    className={
                                        'admin-segmented-nav-btn flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all' +
                                        (isActive ? ' active' : '')
                                    }
                                    style={isActive ? { zIndex: 2 } : {}}
                                    onClick={() => setActiveTab(tab.key)}
                                    type="button"
                                    tabIndex={0}
                                >
                                    <Icon className="h-5 w-5 mr-2" />
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <Card className="rounded-xl bg-white shadow-md mb-8">
                    <CardContent className="p-6">
                        {activeTab === 'orders' && <OrdersTable />}
                        {activeTab === 'repairs' && <RepairManager />}
                        {activeTab === 'pickups' && <PickupScheduler />}
                        {activeTab === 'deliveries' && <DeliveryManager />}
                        {activeTab === 'dropoffs' && <DropoffManager />}
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
};

export default AdminDashboard;

