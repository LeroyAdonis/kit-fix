"use strict";
// src/admin/components/OrdersTable.tsx
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("@/firebaseConfig");
var date_fns_1 = require("date-fns");
var badge_1 = require("@/components/ui/badge");
var skeleton_1 = require("@/components/ui/skeleton");
var OrdersTable = function () {
    var _a = (0, react_1.useState)([]), orders = _a[0], setOrders = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    (0, react_1.useEffect)(function () {
        var fetchOrders = function () { return __awaiter(void 0, void 0, void 0, function () {
            var ordersRef, q, snapshot, orderData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        ordersRef = (0, firestore_1.collection)(firebaseConfig_1.db, "orders");
                        q = (0, firestore_1.query)(ordersRef, (0, firestore_1.orderBy)("createdAt", "desc"));
                        return [4 /*yield*/, (0, firestore_1.getDocs)(q)];
                    case 1:
                        snapshot = _a.sent();
                        orderData = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                        setOrders(orderData);
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Error fetching orders:", error_1);
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        fetchOrders();
    }, []);
    if (loading) {
        return (<div className="space-y-2">
                {__spreadArray([], Array(5), true).map(function (_, i) { return (<skeleton_1.Skeleton key={i} className="h-12 w-full rounded-md"/>); })}
            </div>);
    }
    if (orders.length === 0) {
        return <p className="text-gray-500 text-center">No orders found.</p>;
    }
    return (<div className="overflow-x-auto rounded-lg border shadow-sm">
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
                    {orders.map(function (order) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return (<tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                                {((_a = order.contactInfo) === null || _a === void 0 ? void 0 : _a.name) || "N/A"}<br />
                                <span className="text-xs text-gray-500">{(_b = order.contactInfo) === null || _b === void 0 ? void 0 : _b.email}</span>
                            </td>
                            <td className="p-3">{order.repairType || "N/A"}</td>
                            <td className="p-3">{order.description || "N/A"}</td>
                            <td className="p-3">{order.notes || "N/A"}</td>
                            <td className="p-3">
                                <badge_1.Badge variant="outline" className="capitalize">
                                    {((_c = order.payment) === null || _c === void 0 ? void 0 : _c.status) || "Pending"}
                                </badge_1.Badge>
                            </td>
                            <td className="p-3">
                                <badge_1.Badge variant={((_d = order.payment) === null || _d === void 0 ? void 0 : _d.paid) ? "default" : "destructive"}>
                                    {order.status ? "Paid" : "Unpaid"}
                                </badge_1.Badge>
                            </td>
                            <td className="p-3">
                                <badge_1.Badge variant={((_e = order.payment) === null || _e === void 0 ? void 0 : _e.reference) ? "default" : "destructive"}>
                                    {((_f = order.payment) === null || _f === void 0 ? void 0 : _f.status) ? ((_g = order.payment) === null || _g === void 0 ? void 0 : _g.reference) || "N/A" : "N/A"}
                                </badge_1.Badge>
                            </td>
                            <td className="p-3">
                                {((_h = order.createdAt) === null || _h === void 0 ? void 0 : _h.seconds)
                    ? (0, date_fns_1.format)(new Date(order.createdAt.seconds * 1000), "d MMM yyyy")
                    : "N/A"}
                            </td>
                        </tr>);
        })}
                </tbody>
            </table>
        </div>);
};
exports.default = OrdersTable;
