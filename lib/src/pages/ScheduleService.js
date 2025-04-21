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
var react_hook_form_1 = require("react-hook-form");
var zod_1 = require("@hookform/resolvers/zod");
var zod_2 = require("zod");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var radio_group_1 = require("@/components/ui/radio-group");
var label_1 = require("@/components/ui/label");
var checkbox_1 = require("@/components/ui/checkbox");
var calendar_1 = require("@/components/ui/calendar");
var popover_1 = require("@/components/ui/popover");
var form_1 = require("@/components/ui/form");
var lucide_react_1 = require("lucide-react");
var date_fns_1 = require("date-fns");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("@/firebaseConfig");
var formStorageKey = "kitfix-schedule-service";
var formSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, "Name is required"),
    email: zod_2.z.string().email("Valid email is required"),
    phone: zod_2.z.string().min(10, "Valid phone number is required"),
    address: zod_2.z.string().min(5, "Street address is required"),
    suburb: zod_2.z.string().min(2, "Suburb is required"),
    city: zod_2.z.string().min(2, "City is required"),
    province: zod_2.z.string().min(2, "Province is required"),
    postalCode: zod_2.z.string().min(4, "Postal code is required"),
    deliveryMethod: zod_2.z.enum(["pickup", "dropoff"]),
    date: zod_2.z.date({ required_error: "Please select a date" }),
    termsAccepted: zod_2.z.literal(true, {
        errorMap: function () { return ({ message: "You must accept the terms and conditions" }); },
    }),
});
var ScheduleService = function () {
    var _a;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var location = (0, react_router_dom_1.useLocation)();
    var previousStepData = (_a = location.state) !== null && _a !== void 0 ? _a : JSON.parse(localStorage.getItem("kitfix-quote-data") || "{}");
    var form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            address: "",
            suburb: "",
            city: "",
            province: "",
            postalCode: "",
            deliveryMethod: "pickup",
            termsAccepted: true,
        },
    });
    (0, react_1.useEffect)(function () {
        var savedForm = localStorage.getItem(formStorageKey);
        var parsedSavedForm = {};
        if (savedForm) {
            parsedSavedForm = JSON.parse(savedForm);
            if (parsedSavedForm === null || parsedSavedForm === void 0 ? void 0 : parsedSavedForm.date) {
                parsedSavedForm.date = new Date(parsedSavedForm.date);
            }
            var currentValues = form.getValues();
            var isEmpty = Object.values(currentValues).every(function (val) { return val === "" || val === undefined || val === null; });
            if (isEmpty) {
                form.reset(__assign(__assign({}, form.getValues()), parsedSavedForm));
            }
        }
        var loadUserData = function () { return __awaiter(void 0, void 0, void 0, function () {
            var auth, user, userDocRef, userSnap, userData, combinedUserData, currentValues_1, shouldReset;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        auth = (0, auth_1.getAuth)();
                        user = auth.currentUser;
                        if (!user) {
                            navigate('/login');
                            return [2 /*return*/];
                        }
                        userDocRef = (0, firestore_1.doc)(firebaseConfig_1.db, "users", user.uid);
                        return [4 /*yield*/, (0, firestore_1.getDoc)(userDocRef)];
                    case 1:
                        userSnap = _b.sent();
                        if (userSnap.exists()) {
                            userData = userSnap.data();
                            combinedUserData = {
                                name: userData.name || "",
                                email: userData.email || user.email || "",
                                phone: userData.phone || "",
                                address: userData.address || "",
                                suburb: userData.suburb || "",
                                city: userData.city || "",
                                province: userData.province || "",
                                postalCode: userData.postalCode || "",
                                deliveryMethod: (_a = userData.deliveryMethod) !== null && _a !== void 0 ? _a : "pickup",
                            };
                            currentValues_1 = form.getValues();
                            shouldReset = Object.entries(combinedUserData).some(function (_a) {
                                var key = _a[0], value = _a[1];
                                return currentValues_1[key] !== value;
                            });
                            if (!savedForm && shouldReset) {
                                form.reset(__assign(__assign({}, currentValues_1), combinedUserData));
                            }
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        loadUserData();
    }, [form, navigate]);
    (0, react_1.useEffect)(function () {
        var subscription = form.watch(function (values) {
            localStorage.setItem(formStorageKey, JSON.stringify(values));
        });
        return function () { return subscription.unsubscribe(); };
    }, [form]);
    (0, react_1.useEffect)(function () {
        var savedForm = localStorage.getItem(formStorageKey);
        if (!previousStepData && !savedForm) {
            navigate("/get-quote");
        }
    }, [previousStepData, navigate]);
    var onSubmit = function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var auth, user, orderId, combinedData, orderRef, orderRef, newOrderId, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    auth = (0, auth_1.getAuth)();
                    user = auth.currentUser;
                    if (!user) {
                        navigate('/login');
                        return [2 /*return*/];
                    }
                    orderId = (previousStepData === null || previousStepData === void 0 ? void 0 : previousStepData.orderId) || null;
                    combinedData = __assign(__assign(__assign({}, previousStepData), data), { userId: user.uid, status: 'pending', updatedAt: (0, firestore_1.serverTimestamp)(), photos: ((_a = previousStepData === null || previousStepData === void 0 ? void 0 : previousStepData.photos) === null || _a === void 0 ? void 0 : _a.length) ? previousStepData.photos : [] });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    if (!orderId) return [3 /*break*/, 3];
                    orderRef = (0, firestore_1.doc)(firebaseConfig_1.db, "orders", orderId);
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(orderRef, combinedData)];
                case 2:
                    _b.sent();
                    localStorage.setItem("kitfix-order-id", orderId);
                    navigate('/payment', {
                        state: {
                            orderId: orderId,
                            orderData: combinedData,
                        },
                    });
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(firebaseConfig_1.db, 'orders'), __assign(__assign({}, combinedData), { createdAt: (0, firestore_1.serverTimestamp)() }))];
                case 4:
                    orderRef = _b.sent();
                    newOrderId = orderRef.id;
                    localStorage.setItem("kitfix-order-id", newOrderId);
                    navigate('/payment', {
                        state: {
                            orderId: newOrderId,
                            orderData: combinedData,
                        },
                    });
                    _b.label = 5;
                case 5:
                    localStorage.removeItem(formStorageKey);
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _b.sent();
                    console.error("Error saving order:", error_1);
                    alert("Something went wrong. Please try again.");
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-3xl">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-2">Schedule Service</h1>
                        {(previousStepData === null || previousStepData === void 0 ? void 0 : previousStepData.orderId) && (<p className="text-sm text-muted-foreground text-center mb-4">
                                Editing existing order
                            </p>)}
                        <p className="text-gray-600 text-center mb-8">
                            Choose your preferred pickup or drop-off option and time
                        </p>

                        <form_1.Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                                <section className="space-y-6">
                                    <h2 className="heading-sm">Contact Information</h2>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <form_1.FormField name="name" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                    <form_1.FormLabel>Full Name</form_1.FormLabel>
                                                    <form_1.FormControl><input_1.Input placeholder="John Doe" {...field}/></form_1.FormControl>
                                                    <form_1.FormMessage />
                                                </form_1.FormItem>);
        }}/>
                                        <form_1.FormField name="email" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                    <form_1.FormLabel>Email</form_1.FormLabel>
                                                    <form_1.FormControl><input_1.Input placeholder="you@example.com" {...field}/></form_1.FormControl>
                                                    <form_1.FormMessage />
                                                </form_1.FormItem>);
        }}/>
                                    </div>

                                    <form_1.FormField name="phone" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                <form_1.FormLabel>Phone Number</form_1.FormLabel>
                                                <form_1.FormControl><input_1.Input placeholder="(123) 456-7890" {...field}/></form_1.FormControl>
                                                <form_1.FormMessage />
                                            </form_1.FormItem>);
        }}/>
                                </section>

                                <section className="space-y-6">
                                    <h2 className="heading-sm">Address</h2>
                                    <form_1.FormField name="address" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                <form_1.FormLabel>Street Address</form_1.FormLabel>
                                                <form_1.FormControl><input_1.Input placeholder="123 Main St" {...field}/></form_1.FormControl>
                                                <form_1.FormMessage />
                                            </form_1.FormItem>);
        }}/>

                                    <form_1.FormField name="suburb" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                <form_1.FormLabel>Suburb</form_1.FormLabel>
                                                <form_1.FormControl><input_1.Input placeholder="Sandton" {...field}/></form_1.FormControl>
                                                <form_1.FormMessage />
                                            </form_1.FormItem>);
        }}/>

                                    <div className="grid md:grid-cols-3 gap-6">
                                        <form_1.FormField name="city" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                    <form_1.FormLabel>City</form_1.FormLabel>
                                                    <form_1.FormControl><input_1.Input placeholder="Johannesburg" {...field}/></form_1.FormControl>
                                                    <form_1.FormMessage />
                                                </form_1.FormItem>);
        }}/>
                                        <form_1.FormField name="province" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                    <form_1.FormLabel>Province</form_1.FormLabel>
                                                    <form_1.FormControl><input_1.Input placeholder="Gauteng" {...field}/></form_1.FormControl>
                                                    <form_1.FormMessage />
                                                </form_1.FormItem>);
        }}/>
                                        <form_1.FormField name="postalCode" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                                    <form_1.FormLabel>Postal Code</form_1.FormLabel>
                                                    <form_1.FormControl><input_1.Input placeholder="2000" {...field}/></form_1.FormControl>
                                                    <form_1.FormMessage />
                                                </form_1.FormItem>);
        }}/>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h2 className="heading-sm">Service Options</h2>
                                    <form_1.FormField name="deliveryMethod" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem className="space-y-3">
                                                <form_1.FormLabel>Delivery Method</form_1.FormLabel>
                                                <form_1.FormControl>
                                                    <radio_group_1.RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                                                        <div className="flex items-center space-x-2">
                                                            <radio_group_1.RadioGroupItem value="pickup" id="pickup"/>
                                                            <label_1.Label htmlFor="pickup">Pickup and delivery</label_1.Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <radio_group_1.RadioGroupItem value="dropoff" id="dropoff"/>
                                                            <label_1.Label htmlFor="dropoff">Drop off at repair center</label_1.Label>
                                                        </div>
                                                    </radio_group_1.RadioGroup>
                                                </form_1.FormControl>
                                                <form_1.FormMessage />
                                            </form_1.FormItem>);
        }}/>

                                    <form_1.FormField name="date" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem className="flex flex-col">
                                                <form_1.FormLabel>Preferred Date</form_1.FormLabel>
                                                <popover_1.Popover>
                                                    <popover_1.PopoverTrigger asChild>
                                                        <form_1.FormControl>
                                                            <button_1.Button variant="outline" className="w-full justify-start text-left font-normal">
                                                                <lucide_react_1.Calendar className="mr-2 h-4 w-4"/>
                                                                {field.value ? (0, date_fns_1.format)(field.value, "PPP") : <span>Pick a date</span>}
                                                            </button_1.Button>
                                                        </form_1.FormControl>
                                                    </popover_1.PopoverTrigger>
                                                    <popover_1.PopoverContent align="start" className="w-auto p-0">
                                                        <calendar_1.Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={function (date) {
                    var today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0;
                }} initialFocus/>
                                                    </popover_1.PopoverContent>
                                                </popover_1.Popover>
                                                <form_1.FormMessage />
                                            </form_1.FormItem>);
        }}/>
                                </section>

                                <form_1.FormField name="termsAccepted" control={form.control} render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <form_1.FormControl>
                                                <checkbox_1.Checkbox checked={field.value} onCheckedChange={field.onChange}/>
                                            </form_1.FormControl>
                                            <div className="space-y-1 leading-none">
                                                <form_1.FormLabel>I agree to the terms and conditions</form_1.FormLabel>
                                            </div>
                                            <form_1.FormMessage />
                                        </form_1.FormItem>);
        }}/>

                                <div className="flex justify-between">
                                    <button_1.Button type="button" variant="outline" onClick={function () { return navigate('/get-quote'); }}>
                                        Back
                                    </button_1.Button>
                                    <button_1.Button type="submit">Proceed to Payment</button_1.Button>
                                </div>
                            </form>
                        </form_1.Form>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = ScheduleService;
