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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var button_1 = require("@/components/ui/button");
var radio_group_1 = require("@/components/ui/radio-group");
var label_1 = require("@/components/ui/label");
var textarea_1 = require("@/components/ui/textarea");
var sonner_1 = require("sonner");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var firestore_1 = require("firebase/firestore");
var auth_1 = require("firebase/auth");
var auth_2 = require("react-firebase-hooks/auth");
var firebaseConfig_1 = require("@/firebaseConfig");
var auth = (0, auth_1.getAuth)();
var userId = (_a = auth.currentUser) === null || _a === void 0 ? void 0 : _a.uid;
var repairOptions = [
    {
        id: 'basic',
        title: 'Standard Repair',
        description: 'Basic name and number restoration with standard materials',
        price: 749.99,
        duration: '3-5 days'
    },
    {
        id: 'premium',
        title: 'Premium Repair',
        description: 'Enhanced restoration with premium materials and badge repair',
        price: 1499.99,
        duration: '2-4 days'
    },
    {
        id: 'express',
        title: 'Express Service',
        description: 'Premium repair with express processing and shipping',
        price: 1999.99,
        duration: '1-2 days'
    }
];
var GetQuote = function () {
    var user = (0, auth_2.useAuthState)(auth)[0];
    var searchParams = (0, react_router_dom_1.useSearchParams)()[0];
    var _a = (0, react_1.useState)(null), userData = _a[0], setUserData = _a[1];
    var _b = react_1.default.useState(false), isLoading = _b[0], setIsLoading = _b[1];
    var location = (0, react_router_dom_1.useLocation)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _c = (0, react_1.useState)(function () {
        var _a;
        return (searchParams.get('orderId') ||
            ((_a = location.state) === null || _a === void 0 ? void 0 : _a.orderId) ||
            (userId ? localStorage.getItem("kitfix-".concat(userId, "-order-id")) : undefined));
    }), orderId = _c[0], setOrderId = _c[1];
    var _d = (0, react_1.useState)(function () {
        var stored = userId ? localStorage.getItem("kitfix-".concat(userId, "-quote-photos")) : null;
        return stored ? JSON.parse(stored) : [];
    }), photos = _d[0], setPhotos = _d[1];
    var _e = (0, react_1.useState)(function () {
        return userId ? localStorage.getItem("kitfix-".concat(userId, "-quote-repairType")) || "basic" : "basic";
    }), selectedOption = _e[0], setSelectedOption = _e[1];
    var _f = (0, react_1.useState)(function () {
        return userId ? localStorage.getItem("kitfix-".concat(userId, "-quote-notes")) || "" : "";
    }), additionalNotes = _f[0], setAdditionalNotes = _f[1];
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
    (0, react_1.useEffect)(function () {
        if (photos) {
            console.log('Received photos:', photos);
        }
    }, [photos]);
    (0, react_1.useEffect)(function () {
        if (userId) {
            localStorage.setItem("kitfix-".concat(userId, "-order-id"), orderId);
        }
    }, [orderId]);
    (0, react_1.useEffect)(function () {
        if (userId) {
            localStorage.setItem("kitfix-".concat(userId, "-quote-photos"), JSON.stringify(photos));
        }
    }, [photos]);
    (0, react_1.useEffect)(function () {
        if (userId) {
            localStorage.setItem("kitfix-".concat(userId, "-quote-repairType"), selectedOption);
        }
    }, [selectedOption]);
    (0, react_1.useEffect)(function () {
        if (userId) {
            localStorage.setItem("kitfix-".concat(userId, "-quote-notes"), additionalNotes);
        }
    }, [additionalNotes]);
    var handleSubmit = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var selectedRepairOption, db_1, orderRef, quoteData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoading(true);
                    e.preventDefault();
                    if (!selectedOption) {
                        sonner_1.toast.error('Please select a repair option');
                        return [2 /*return*/];
                    }
                    selectedRepairOption = repairOptions.find(function (option) { return option.id === selectedOption; });
                    if (!selectedRepairOption) {
                        sonner_1.toast.error('Invalid repair option selected');
                        return [2 /*return*/];
                    }
                    if (!orderId) {
                        sonner_1.toast.error("Order ID not found. Please restart your repair.");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    db_1 = (0, firestore_1.getFirestore)();
                    orderRef = (0, firestore_1.doc)(db_1, "orders", orderId);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(orderRef, {
                            repairType: selectedOption,
                            repairDescription: selectedRepairOption.description,
                            price: selectedRepairOption.price,
                            duration: selectedRepairOption.duration,
                            notes: additionalNotes,
                            stepCompleted: "quote"
                        })];
                case 2:
                    _a.sent();
                    setIsLoading(false);
                    sonner_1.toast.success('Quote saved. Proceeding to scheduling.');
                    quoteData = {
                        orderId: orderId,
                        photos: photos,
                        selectedOption: selectedOption,
                        price: selectedRepairOption.price,
                        duration: selectedRepairOption.duration,
                        notes: additionalNotes,
                        description: selectedRepairOption.description
                    };
                    localStorage.setItem("kitfix-quote-data", JSON.stringify(quoteData));
                    // if (userId) {
                    //     localStorage.removeItem(`kitfix-${userId}-quote-repairType`);
                    //     localStorage.removeItem(`kitfix-${userId}-quote-notes`);
                    //     localStorage.removeItem(`kitfix-${userId}-quote-photos`);
                    // }
                    navigate('/schedule-service', {
                        state: {
                            orderId: orderId,
                            photos: photos,
                            selectedOption: selectedOption,
                            price: selectedRepairOption.price,
                            duration: selectedRepairOption.duration,
                            notes: additionalNotes,
                            description: selectedRepairOption.description
                        }
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    setIsLoading(false);
                    console.error("Error updating order:", error_1);
                    sonner_1.toast.error("Something went wrong while saving your quote.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var selectedRepairOption = repairOptions.find(function (option) { return option.id === selectedOption; });
    if (!userData) {
        return (<div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>);
    }
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-3xl">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-2">Get Your Quote</h1>
                        <p className="text-gray-600 text-center mb-8">
                            Select the repair service that best suits your needs
                        </p>

                        {/* {photos && (
            <div className="mb-8">
                <h3 className="font-bold mb-4">Uploaded Photos</h3>
                <div className="grid grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                        <img
                            key={index}
                            src={photo}
                            alt={`Uploaded ${index + 1}`}
                            className="w-full h-auto rounded-lg"
                        />
                    ))}
                </div>
            </div>
        )} */}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <radio_group_1.RadioGroup defaultValue="basic" value={selectedOption} onValueChange={setSelectedOption} className="grid gap-6">
                                {repairOptions.map(function (option) { return (<div key={option.id} className="relative">
                                        <radio_group_1.RadioGroupItem value={option.id} id={option.id} className="peer sr-only"/>
                                        <label_1.Label htmlFor={option.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-electric-blue peer-data-[state=checked]:bg-blue-50">
                                            <div className="mb-4 md:mb-0">
                                                <h3 className="font-bold text-lg">{option.title}</h3>
                                                <p className="text-gray-600">{option.description}</p>
                                                <p className="text-sm text-gray-500">Processing time: {option.duration}</p>
                                            </div>
                                            <div className="font-bold text-2xl text-electric-blue">
                                                R{option.price.toFixed(2)}
                                            </div>
                                        </label_1.Label>
                                    </div>); })}
                            </radio_group_1.RadioGroup>

                            <div className="space-y-4">
                                <label_1.Label htmlFor="notes">Additional Notes (Optional)</label_1.Label>
                                <textarea_1.Textarea id="notes" placeholder="Tell us any specific details about your jersey repair..." value={additionalNotes} onChange={function (e) { return setAdditionalNotes(e.target.value); }} className="min-h-[120px]"/>
                            </div>

                            {selectedRepairOption && (<div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold mb-2">Quote Summary</h3>
                                    <div className="flex justify-between mb-2">
                                        <span>Service:</span>
                                        <span>{selectedRepairOption.title}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span>Processing Time:</span>
                                        <span>{selectedRepairOption.duration}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                        <span>Total:</span>
                                        <span className="text-electric-blue">R{selectedRepairOption.price.toFixed(2)}</span>
                                    </div>
                                </div>)}

                            <div className="flex justify-between">
                                <button_1.Button type="button" variant="outline" onClick={function () { return navigate('/upload-photos'); }}>
                                    Back
                                </button_1.Button>
                                <button_1.Button type="submit">
                                    Schedule Service
                                </button_1.Button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = GetQuote;
