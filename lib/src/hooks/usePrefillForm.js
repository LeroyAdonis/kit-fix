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
exports.usePrefillForm = void 0;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("@/firebaseConfig");
var STORAGE_KEY = "kitfix-schedule-service";
var usePrefillForm = function (form, previousStepData) {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)(true), isLoading = _a[0], setIsLoading = _a[1]; // Adding loading state
    var loadUserData = function () { return __awaiter(void 0, void 0, void 0, function () {
        var auth, user, userDocRef, userSnap, userData, mergedData, currentValues, shouldReset, savedForm;
        return __generator(this, function (_a) {
            switch (_a.label) {
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
                    userSnap = _a.sent();
                    if (!userSnap.exists())
                        return [2 /*return*/];
                    userData = userSnap.data();
                    mergedData = {
                        name: userData.name || "",
                        email: userData.email || user.email || "",
                        phone: userData.phone || "",
                        address: userData.address || "",
                        suburb: userData.suburb || "",
                        city: userData.city || "",
                        province: userData.province || "",
                        postalCode: userData.postalCode || "",
                        deliveryMethod: userData.deliveryMethod || "pickup",
                    };
                    currentValues = form.getValues();
                    shouldReset = Object.entries(mergedData).some(function (_a) {
                        var key = _a[0], value = _a[1];
                        return currentValues[key] !== value;
                    });
                    savedForm = localStorage.getItem(STORAGE_KEY);
                    if (!savedForm && shouldReset) {
                        form.reset(__assign(__assign({}, currentValues), mergedData));
                    }
                    setIsLoading(false); // Set loading to false once data is fetched
                    return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (parsed === null || parsed === void 0 ? void 0 : parsed.date)
                parsed.date = new Date(parsed.date);
            var currentValues = form.getValues();
            var isEmpty = Object.values(currentValues).every(function (val) { return val === "" || val === undefined || val === null; });
            if (isEmpty)
                form.reset(__assign(__assign({}, currentValues), parsed));
        }
        loadUserData();
    }, [form]);
    return { isLoading: isLoading };
};
exports.usePrefillForm = usePrefillForm;
