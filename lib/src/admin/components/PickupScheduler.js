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
// admin/components/PickupScheduler.tsx
var react_1 = require("react");
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("@/firebaseConfig");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var date_fns_1 = require("date-fns");
var sonner_1 = require("sonner");
var skeleton_1 = require("@/components/ui/skeleton");
var PickupScheduler = function () {
    var _a = (0, react_1.useState)([]), orders = _a[0], setOrders = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    (0, react_1.useEffect)(function () {
        var fetchPickupOrders = function () { return __awaiter(void 0, void 0, void 0, function () {
            var snapshot, pickupOrders, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(firebaseConfig_1.db, "orders"))];
                    case 1:
                        snapshot = _a.sent();
                        pickupOrders = snapshot.docs
                            .map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })
                            .filter(function (order) { var _a; return ((_a = order.processing) === null || _a === void 0 ? void 0 : _a.deliveryMethod) === "dropoff"; });
                        setOrders(pickupOrders);
                        setLoading(false);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Error fetching pickup orders:", error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        fetchPickupOrders();
    }, []);
    var updatePickup = function (orderId, field, value) { return __awaiter(void 0, void 0, void 0, function () {
        var orderRef, error_2;
        var _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    orderRef = (0, firestore_1.doc)(firebaseConfig_1.db, "orders", orderId);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(orderRef, (_a = {},
                            _a["processing.".concat(field)] = value,
                            _a))];
                case 1:
                    _d.sent();
                    setOrders(function (prev) {
                        return prev.map(function (order) {
                            var _a;
                            return order.id === orderId
                                ? __assign(__assign({}, order), { processing: __assign(__assign({}, order.processing), (_a = {}, _a[field] = value, _a)) }) : order;
                        });
                    });
                    if (field === "pickupStatus" && value === "scheduled") {
                        sonner_1.toast.success("Pickup scheduled for ".concat((_c = (_b = orders.find(function (order) { return order.id === orderId; })) === null || _b === void 0 ? void 0 : _b.contactInfo) === null || _c === void 0 ? void 0 : _c.name));
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _d.sent();
                    console.error("Error updating pickup info:", error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (<div className="space-y-2">
                {__spreadArray([], Array(5), true).map(function (_, i) { return (<skeleton_1.Skeleton key={i} className="h-12 w-full rounded-md"/>); })}
            </div>);
    }
    return (<div className="space-y-6">
            {orders.length === 0 && <p>No pickup orders found.</p>}
            {orders.map(function (order) {
            var _a, _b, _c, _d;
            return (<div key={order.id} className="p-4 border rounded-xl bg-white shadow-md">
                    <h3 className="font-semibold text-lg mb-2">{(_a = order.contactInfo) === null || _a === void 0 ? void 0 : _a.name}</h3>
                    <p className="text-sm text-jet-black">Email: {(_b = order.contactInfo) === null || _b === void 0 ? void 0 : _b.email}</p>
                    <p className="text-sm text-jet-black">Phone: {(_c = order.contactInfo) === null || _c === void 0 ? void 0 : _c.phone}</p>
                    <p className="text-sm mb-2 text-jet-black">Address: {((_d = order.contactInfo) === null || _d === void 0 ? void 0 : _d.address) + ", " + order.city}</p>

                    <div className="flex gap-4 items-center mb-2 w-3/15">
                        <label_1.Label htmlFor={"pickupDate-".concat(order.id)}>Pickup Date:</label_1.Label>
                        <input_1.Input id={"pickupDate-".concat(order.id)} type="date" value={order.processing.pickupDate
                    ? (0, date_fns_1.format)(new Date(order.processing.pickupDate), "yyyy-MM-dd")
                    : ""} onChange={function (e) { return updatePickup(order.id, "pickupDate", e.target.value); }}/>
                    </div>

                    <div className="flex gap-4 items-center">
                        <label_1.Label htmlFor={"pickupStatus-".concat(order.id)}>Status:</label_1.Label>
                        <select id={"pickupStatus-".concat(order.id)} value={order.processing.pickupStatus || "pending"} onChange={function (e) { return updatePickup(order.id, "pickupStatus", e.target.value); }} className="border rounded px-3 py-1">
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="picked up">Picked Up</option>
                        </select>
                        <button_1.Button variant="outline" onClick={function () { return updatePickup(order.id, "pickupStatus", "scheduled"); }}>
                            Set as Scheduled
                        </button_1.Button>
                    </div>
                </div>);
        })}
        </div>);
};
exports.default = PickupScheduler;
