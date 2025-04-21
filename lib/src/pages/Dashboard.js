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
var auth_1 = require("react-firebase-hooks/auth");
var firebaseConfig_1 = require("@/firebaseConfig");
var firestore_1 = require("firebase/firestore");
var authService_1 = require("@/services/authService");
var button_1 = require("@/components/ui/button");
var date_fns_1 = require("date-fns");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var Dashboard = function () {
    var _a = (0, auth_1.useAuthState)(firebaseConfig_1.auth), user = _a[0], loading = _a[1], error = _a[2];
    var _b = (0, react_1.useState)(null), userData = _b[0], setUserData = _b[1];
    var _c = (0, react_1.useState)([]), orders = _c[0], setOrders = _c[1];
    var navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(function () {
        if (!user && !loading) {
            // Log user out when session closes
            (0, authService_1.logoutUser)();
        }
    }, [user, loading]);
    (0, react_1.useEffect)(function () {
        var fetchUserData = function () { return __awaiter(void 0, void 0, void 0, function () {
            var docRef, docSnap;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!user) return [3 /*break*/, 2];
                        docRef = (0, firestore_1.doc)(firebaseConfig_1.db, 'users', user.uid);
                        return [4 /*yield*/, (0, firestore_1.getDoc)(docRef)];
                    case 1:
                        docSnap = _a.sent();
                        if (docSnap.exists()) {
                            setUserData(docSnap.data());
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); };
        var fetchOrders = function () { return __awaiter(void 0, void 0, void 0, function () {
            var q, querySnapshot, ordersList;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!user) return [3 /*break*/, 2];
                        q = (0, firestore_1.query)((0, firestore_1.collection)(firebaseConfig_1.db, 'orders'), (0, firestore_1.where)('userId', '==', user.uid));
                        return [4 /*yield*/, (0, firestore_1.getDocs)(q)];
                    case 1:
                        querySnapshot = _a.sent();
                        ordersList = querySnapshot.docs.map(function (doc) {
                            console.log("Fetched order:", doc.id, doc.data());
                            return __assign({ id: doc.id }, doc.data());
                        });
                        setOrders(ordersList);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); };
        fetchUserData();
        fetchOrders();
    }, [user]);
    var logout = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, authService_1.logoutUser)()];
                case 1:
                    _a.sent();
                    navigate("/login");
                    return [2 /*return*/];
            }
        });
    }); };
    var cancelOrder = function (orderId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!window.confirm('Are you sure you want to cancel this order?')) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebaseConfig_1.db, 'orders', orderId))];
                case 1:
                    _a.sent();
                    setOrders(orders.filter(function (order) { return order.id !== orderId; }));
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    if (!userData) {
        return (<div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>);
    }
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom">
                    <div className="glass-card p-8 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="heading-lg">Welcome, {userData.name || 'User'}</h1>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h2 className="heading-sm">Your Information</h2>
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-gray-700"><strong>Name:</strong> {userData.name}</p>
                                    <p className="text-gray-700"><strong>Email:</strong> {userData.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="heading-sm">Start a New Repair</h2>
                                <p className="text-gray-700 mb-4">
                                    Ready to get your jersey fixed? Start the repair process now.
                                </p>
                                <react_router_dom_1.Link to="/upload-photos">
                                    <button_1.Button className="sm:w-full md:w-1/2 mt-4 ">Start New Repair</button_1.Button>
                                </react_router_dom_1.Link>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <h2 className="heading-sm mb-6">Your Repair History</h2>
                        {orders.length === 0 ? (<div className="bg-background rounded-lg p-8 text-center">
                                <p className="text-gray-700 mb-4">You don't have any repair history yet.</p>
                                <react_router_dom_1.Link to="/upload-photos">
                                    <button_1.Button variant="outline">Start Your First Repair</button_1.Button>
                                </react_router_dom_1.Link>
                            </div>) : (<div className="grid md:grid-cols-2 gap-8 sm:grid-cols-1 sm:gap-4">

                                {orders.map(function (order) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
                return (<div key={order.id} className={"bg-".concat(((_a = order.payment) === null || _a === void 0 ? void 0 : _a.status) === 'paid' ? 'gradient-accent' : 'gradient-primary text-pure-white', " rounded-lg p-4 shadow-sm order-history")}>
                                        {((_b = order.payment) === null || _b === void 0 ? void 0 : _b.status) === 'paid' && (<h2 className="heading-sm mb-2">Completed Order</h2>)}
                                        {((_c = order.payment) === null || _c === void 0 ? void 0 : _c.status) !== 'paid' && (<h2 className="heading-sm mb-2">Pending Order</h2>)}
                                        <p className={"".concat(((_d = order.payment) === null || _d === void 0 ? void 0 : _d.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Order Number:</strong> {"kf".concat(order.id.slice(0, 6))}</p>
                                        <p className={"".concat(((_e = order.payment) === null || _e === void 0 ? void 0 : _e.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Status:</strong> {order.status || 'Pending'}</p>
                                        <p className={"".concat(((_f = order.payment) === null || _f === void 0 ? void 0 : _f.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Order Date:</strong> {((_g = order.createdAt) === null || _g === void 0 ? void 0 : _g.seconds) ? (0, date_fns_1.format)(new Date(order.createdAt.seconds * 1000).toLocaleString(), "d MMM yyyy") : 'Unknown'}</p>
                                        <p className={"".concat(((_h = order.payment) === null || _h === void 0 ? void 0 : _h.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Paid:</strong> {((_j = order.payment) === null || _j === void 0 ? void 0 : _j.status) === 'paid' ? 'Yes' : 'No'}</p>
                                        <p className={"".concat(((_k = order.payment) === null || _k === void 0 ? void 0 : _k.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Repair Type:</strong> {order.repairType || 'Unknown'}</p>
                                        <p className={"".concat(((_l = order.payment) === null || _l === void 0 ? void 0 : _l.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Delivery Method:</strong> {order.processing.deliveryMethod || 'Unknown'}</p>
                                        {((_m = order.processing) === null || _m === void 0 ? void 0 : _m.deliveryMethod) === 'pickup' ? (<p className={"".concat(((_o = order.payment) === null || _o === void 0 ? void 0 : _o.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Pickup Date:</strong> {order.processing.pickupDate ? (0, date_fns_1.format)(new Date(order.processing.pickupDate), "d MMM yyyy") : 'Unknown'}</p>) : (<p className={"".concat(((_p = order.payment) === null || _p === void 0 ? void 0 : _p.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Dropoff Date:</strong> {order.processing.deliveryDate.toDate() ? (0, date_fns_1.format)(new Date(order.processing.deliveryDate.toDate()), "d MMM yyyy") : 'Unknown'}</p>)}
                                        <p className={"".concat(((_q = order.payment) === null || _q === void 0 ? void 0 : _q.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Duration:</strong> {(_r = order.processing) === null || _r === void 0 ? void 0 : _r.duration}</p>
                                        {((_s = order.repairDetails) === null || _s === void 0 ? void 0 : _s.additionalNotes) && (<p className={"".concat(((_t = order.payment) === null || _t === void 0 ? void 0 : _t.status) === 'paid' ? 'text-black' : 'text-pure-white')}><strong>Notes:</strong> {order.repairDetails.additionalNotes}</p>)}
                                        {((_u = order.images) === null || _u === void 0 ? void 0 : _u[0]) && (<img src={order.images[0]} alt="Jersey" className="mt-2 max-w-xs rounded-md border"/>)}
                                        {((_v = order.payment) === null || _v === void 0 ? void 0 : _v.status) !== 'paid' && (<div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                                                <react_router_dom_1.Link to={"/get-quote?orderId=".concat(order.id)} className="w-full sm:w-auto">
                                                    <button_1.Button variant="outline" className="w-full mt-4 continue-repair-button btn-primary">Continue Repair</button_1.Button>
                                                </react_router_dom_1.Link>
                                                <button_1.Button variant="outline" className="w-full sm:w-auto mt-4 cancel-repair-button btn-accent" onClick={function () { return cancelOrder(order.id); }}>Cancel Order</button_1.Button>
                                            </div>)}
                                    </div>);
            })}
                            </div>)}
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = Dashboard;
