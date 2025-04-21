"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var Confirmation = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    // Generate a mock order number
    var orderNumber = "KF".concat(Math.floor(100000 + Math.random() * 900000));
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-2xl">
                    <div className="glass-card p-8 text-center">
                        <lucide_react_1.CheckCircle className="w-20 h-20 text-lime-green mx-auto mb-6"/>

                        <h1 className="heading-lg mb-4">Order Confirmed!</h1>
                        <p className="text-gray-600 text-xl mb-6">
                            Thank you for your order. Your jersey repair is now in process.
                        </p>

                        <div className="bg-gray-50 p-6 rounded-lg mb-8">
                            <h2 className="heading-sm mb-4">Order Details</h2>

                            <div className="grid md:grid-cols-2 gap-4 text-left">
                                <div>
                                    <p className="text-gray-500">Order Number:</p>
                                    <p className="font-bold">{orderNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status:</p>
                                    <p className="font-bold text-lime-green">Processing</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Service:</p>
                                    <p className="font-bold">Premium Repair</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Total Paid:</p>
                                    <p className="font-bold">$87.98</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-gray-700">
                                We'll send you updates about your repair via email. You can also check the status in your account dashboard.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <button_1.Button onClick={function () { return navigate('/dashboard'); }}>
                                    Go to Dashboard
                                </button_1.Button>
                                <button_1.Button variant="outline" onClick={function () { return navigate('/'); }}>
                                    Return to Home
                                </button_1.Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = Confirmation;
