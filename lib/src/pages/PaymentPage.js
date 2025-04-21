"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var button_1 = require("@/components/ui/button");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("@/firebaseConfig");
var use_toast_1 = require("@/hooks/use-toast");
var form_1 = require("@/components/ui/form");
var input_1 = require("@/components/ui/input");
var react_hook_form_1 = require("react-hook-form");
var PaymentPage = function () {
    var publicKey = 'pk_test_47613641c497d46502f6efadf29ef3c821f7b459';
    var location = (0, react_router_dom_1.useLocation)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var toast = (0, use_toast_1.useToast)().toast;
    var methods = (0, react_hook_form_1.useForm)();
    var _a = (0, react_1.useState)(false), isLoading = _a[0], setIsLoading = _a[1];
    var _b = (0, react_1.useState)(null), finalOrderData = _b[0], setFinalOrderData = _b[1];
    var _c = (0, react_1.useState)(null), finalOrderId = _c[0], setFinalOrderId = _c[1];
    (0, react_1.useEffect)(function () {
        var _a, _b, _c;
        var localData = localStorage.getItem('orderData');
        var localId = localStorage.getItem('orderId');
        var stateOrderData = ((_a = location.state) === null || _a === void 0 ? void 0 : _a.orderData) || location.state;
        if (stateOrderData) {
            setFinalOrderData(stateOrderData);
            setFinalOrderId(((_b = location.state) === null || _b === void 0 ? void 0 : _b.orderId) || null);
            localStorage.setItem('orderData', JSON.stringify(stateOrderData));
            if ((_c = location.state) === null || _c === void 0 ? void 0 : _c.orderId) {
                localStorage.setItem('orderId', location.state.orderId);
            }
        }
        else if (localData) {
            setFinalOrderData(JSON.parse(localData));
            setFinalOrderId(localId);
        }
        else {
            navigate('/get-quote');
        }
    }, [location.state, navigate]);
    var handlePaymentSuccess = function (reference) { return __awaiter(void 0, void 0, void 0, function () {
        var auth, user, structuredOrder, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    auth = (0, auth_1.getAuth)();
                    user = auth.currentUser;
                    if (!user) {
                        toast({ title: "Error", description: "User not authenticated" });
                        return [2 /*return*/];
                    }
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 6, , 7]);
                    structuredOrder = {
                        userId: user.uid,
                        contactInfo: {
                            name: finalOrderData.name,
                            email: finalOrderData.email,
                            phone: finalOrderData.phone,
                            address: finalOrderData.address,
                        },
                        repairDetails: {
                            type: ((_a = finalOrderData.selectedOption) === null || _a === void 0 ? void 0 : _a.label) || "",
                            price: ((_b = finalOrderData.selectedOption) === null || _b === void 0 ? void 0 : _b.price) || 0,
                            description: ((_c = finalOrderData.selectedOption) === null || _c === void 0 ? void 0 : _c.description) || "",
                            additionalNotes: finalOrderData.additionalNotes || "",
                        },
                        processing: {
                            duration: finalOrderData.duration,
                            deliveryMethod: finalOrderData.deliveryMethod,
                            deliveryDate: finalOrderData.date ? firestore_1.Timestamp.fromDate(new Date(finalOrderData.date)) : null,
                        },
                        payment: {
                            amount: finalOrderData.price,
                            reference: reference,
                            status: "paid",
                            method: "Paystack",
                            paidAt: firestore_1.Timestamp.now(),
                        },
                        status: "paid",
                        createdAt: firestore_1.Timestamp.now(),
                        updatedAt: firestore_1.Timestamp.now(),
                    };
                    if (!finalOrderId) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebaseConfig_1.db, "orders", finalOrderId), structuredOrder)];
                case 2:
                    _d.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firestore_1.collection)(firebaseConfig_1.db, "orders")), structuredOrder)];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    toast({ title: "Payment successful!", description: "Your order has been placed." });
                    localStorage.removeItem('orderData');
                    localStorage.removeItem('orderId');
                    navigate("/dashboard");
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _d.sent();
                    console.error("Error saving order:", error_1);
                    toast({ title: "Something went wrong", description: "We couldn't save your order." });
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handlePaystack = function () {
        setIsLoading(true);
        var paystack = window.PaystackPop.setup({
            key: publicKey,
            email: finalOrderData.email,
            amount: finalOrderData.price * 100,
            currency: "ZAR",
            metadata: {
                name: finalOrderData.name,
                phone: finalOrderData.phone,
                email: finalOrderData.email,
                address: finalOrderData.address,
                repairType: finalOrderData.selectedOption,
                processingTime: finalOrderData.duration,
                additionalNotes: finalOrderData.additionalNotes
            },
            callback: function (response) {
                handlePaymentSuccess(response.reference);
                setIsLoading(false);
            },
            onClose: function () {
                toast({ variant: "destructive", title: "Payment cancelled" });
                setIsLoading(false);
            }
        });
        paystack.openIframe();
    };
    var handleInputChange = function (field, value) {
        setFinalOrderData(function (prevData) {
            var _a;
            return (__assign(__assign({}, prevData), (_a = {}, _a[field] = value, _a)));
        });
    };
    if (!finalOrderData) {
        return <div>Order data is missing.</div>;
    }
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container mx-auto max-w-3xl">
                    <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
                        <h1 className="text-2xl font-bold">Confirm & Pay</h1>
                        <react_hook_form_1.FormProvider {...methods}>
                            <form_1.Form {...methods}>
                                <div className="bg-gray-50 rounded-lg p-4 shadow-sm payment-confirmation space-y-4">
                                    <form_1.FormItem>
                                        <form_1.FormLabel>Name</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.name) || ''} onChange={function (e) { return handleInputChange('name', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>

                                    <form_1.FormItem>
                                        <form_1.FormLabel>Email</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.email) || ''} onChange={function (e) { return handleInputChange('email', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>

                                    <form_1.FormItem>
                                        <form_1.FormLabel>Phone</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.phone) || ''} onChange={function (e) { return handleInputChange('phone', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>

                                    <form_1.FormItem>
                                        <form_1.FormLabel>Address</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.address) || ''} onChange={function (e) { return handleInputChange('address', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>

                                    <form_1.FormItem>
                                        <form_1.FormLabel>Repair Type</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.selectedOption) || ''} onChange={function (e) { return handleInputChange('selectedOption', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>
                                    <form_1.FormItem>
                                        <form_1.FormLabel>Repair Description</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.description) || ''} onChange={function (e) { return handleInputChange('description', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>
                                    <form_1.FormItem>
                                        <form_1.FormLabel>Processing Time</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.duration) || ''} onChange={function (e) { return handleInputChange('duration', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>
                                    <form_1.FormItem>
                                        <form_1.FormLabel>Additional Notes</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.notes) ? finalOrderData.notes : 'No additional notes'} onChange={function (e) { return handleInputChange('notes', e.target.value); }} disabled={false}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>
                                    <form_1.FormItem>
                                        <form_1.FormLabel>Quote</form_1.FormLabel>
                                        <form_1.FormControl>
                                            <input_1.Input value={(finalOrderData === null || finalOrderData === void 0 ? void 0 : finalOrderData.price) || ''} onChange={function (e) { return handleInputChange('price', e.target.value); }} disabled={true}/>
                                        </form_1.FormControl>
                                    </form_1.FormItem>
                                </div>
                            </form_1.Form>
                        </react_hook_form_1.FormProvider>

                        <div className="flex justify-between flex-wrap gap-2">
                            <button_1.Button onClick={handlePaystack} disabled={isLoading}>
                                {isLoading ? "Processing..." : "Pay Now"}
                            </button_1.Button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = PaymentPage;
