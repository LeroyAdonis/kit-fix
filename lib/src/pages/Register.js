"use strict";
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
var zod_1 = require("@hookform/resolvers/zod");
var react_hook_form_1 = require("react-hook-form");
var zod_2 = require("zod");
var react_router_dom_1 = require("react-router-dom");
var button_1 = require("@/components/ui/button");
var form_1 = require("@/components/ui/form");
var input_1 = require("@/components/ui/input");
var Header_1 = require("@/components/Header");
var Footer_1 = require("@/components/Footer");
var firebaseConfig_1 = require("../firebaseConfig");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var formSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: zod_2.z.string().email({ message: "Please enter a valid email address." }),
    password: zod_2.z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: zod_2.z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine(function (data) { return data.password === data.confirmPassword; }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
var Register = function () {
    var _a = react_1.default.useState(false), isLoading = _a[0], setIsLoading = _a[1];
    var navigate = (0, react_router_dom_1.useNavigate)();
    var form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });
    function onSubmit(data) {
        return __awaiter(this, void 0, void 0, function () {
            var userCredential, user, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setIsLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, (0, auth_1.createUserWithEmailAndPassword)(firebaseConfig_1.auth, data.email, data.password)];
                    case 2:
                        userCredential = _a.sent();
                        user = userCredential.user;
                        // Update display name
                        return [4 /*yield*/, (0, auth_1.updateProfile)(user, { displayName: data.name })];
                    case 3:
                        // Update display name
                        _a.sent();
                        // Save user details to Firestore
                        return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(firebaseConfig_1.db, "users", user.uid), {
                                uid: user.uid,
                                name: data.name,
                                email: data.email,
                                phone: "", // optional at registration
                                orderHistory: [],
                                paymentStatus: "",
                                deliveryAddress: "",
                                jerseyImages: [],
                            })];
                    case 4:
                        // Save user details to Firestore
                        _a.sent();
                        setIsLoading(false);
                        navigate("/dashboard");
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        setIsLoading(false); // Ensure loading state is reset in case of error
                        alert(error_1.message);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main className="flex-grow flex items-center justify-center py-16 px-4">
                <div className="w-full max-w-md">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-6">Register</h1>
                        <form_1.Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <form_1.FormField control={form.control} name="name" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                            <form_1.FormLabel>Full Name</form_1.FormLabel>
                                            <form_1.FormControl>
                                                <input_1.Input placeholder="John Doe" {...field}/>
                                            </form_1.FormControl>
                                            <form_1.FormMessage />
                                        </form_1.FormItem>);
        }}/>

                                <form_1.FormField control={form.control} name="email" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                            <form_1.FormLabel>Email</form_1.FormLabel>
                                            <form_1.FormControl>
                                                <input_1.Input placeholder="your@email.com" {...field}/>
                                            </form_1.FormControl>
                                            <form_1.FormMessage />
                                        </form_1.FormItem>);
        }}/>

                                <form_1.FormField control={form.control} name="password" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                            <form_1.FormLabel>Password</form_1.FormLabel>
                                            <form_1.FormControl>
                                                <input_1.Input type="password" placeholder="******" {...field}/>
                                            </form_1.FormControl>
                                            <form_1.FormMessage />
                                        </form_1.FormItem>);
        }}/>

                                <form_1.FormField control={form.control} name="confirmPassword" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                            <form_1.FormLabel>Confirm Password</form_1.FormLabel>
                                            <form_1.FormControl>
                                                <input_1.Input type="password" placeholder="******" {...field}/>
                                            </form_1.FormControl>
                                            <form_1.FormMessage />
                                        </form_1.FormItem>);
        }}/>

                                <button_1.Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Creating Account...' : 'Register'}
                                </button_1.Button>
                            </form>
                        </form_1.Form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                Already have an account?{" "}
                                <react_router_dom_1.Link to="/login" className="text-electric-blue hover:underline">
                                    Login
                                </react_router_dom_1.Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = Register;
