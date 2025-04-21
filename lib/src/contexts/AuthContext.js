"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
// src/contexts/AuthContext.tsx
var react_1 = require("react");
var auth_1 = require("firebase/auth");
var firebaseConfig_1 = require("@/firebaseConfig");
var authService_1 = require("@/services/authService");
var dialog_1 = require("@/components/ui/dialog");
var AuthContext = (0, react_1.createContext)({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInactive: false,
});
var AuthProvider = function (_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)(null), user = _b[0], setUser = _b[1];
    var _c = (0, react_1.useState)(true), isLoading = _c[0], setIsLoading = _c[1];
    var _d = (0, react_1.useState)(false), isInactive = _d[0], setIsInactive = _d[1];
    var _e = (0, react_1.useState)(false), dialogOpen = _e[0], setDialogOpen = _e[1];
    var _f = (0, react_1.useState)(30), logoutCountdown = _f[0], setLogoutCountdown = _f[1];
    (0, react_1.useEffect)(function () {
        var unsubscribe = (0, auth_1.onAuthStateChanged)(firebaseConfig_1.auth, function (firebaseUser) {
            console.log("[AuthContext] Firebase user changed:", firebaseUser);
            if (!firebaseUser) {
                Object.keys(localStorage).forEach(function (key) {
                    if (key.startsWith("kitfix-")) {
                        localStorage.removeItem(key);
                    }
                });
                (0, authService_1.logoutUser)();
                setIsInactive(false);
                setDialogOpen(false);
            }
            setUser(firebaseUser);
            setIsLoading(false);
        });
        return function () { return unsubscribe(); };
    }, []);
    (0, react_1.useEffect)(function () {
        var timeoutId = null;
        if (user && !isInactive) {
            timeoutId = window.setTimeout(function () {
                setIsInactive(true);
                setDialogOpen(true);
            }, 900000); // 30 seconds
        }
        return function () {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [isInactive, user]);
    (0, react_1.useEffect)(function () {
        if (isInactive && dialogOpen) {
            var intervalId_1 = setInterval(function () {
                setLogoutCountdown(function (prevCountdown) {
                    if (prevCountdown === 0) {
                        (0, authService_1.logoutUser)();
                        setIsInactive(false);
                        setDialogOpen(false);
                        return 30;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);
            return function () { return clearInterval(intervalId_1); };
        }
    }, [isInactive, dialogOpen]);
    var handleStayLoggedIn = function () {
        setIsInactive(false);
        setDialogOpen(false);
        setLogoutCountdown(30);
    };
    var handleLogout = function () {
        (0, authService_1.logoutUser)();
        setIsInactive(false);
        setDialogOpen(false);
        setLogoutCountdown(30);
    };
    return (<AuthContext.Provider value={{
            user: user,
            isAuthenticated: !!user,
            isLoading: isLoading,
            isInactive: isInactive,
        }}>
            <dialog_1.Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <dialog_1.DialogContent>
                    <dialog_1.DialogHeader>
                        <dialog_1.DialogTitle>Would you like to stay logged in?</dialog_1.DialogTitle>
                        <dialog_1.DialogDescription>
                            You have been inactive for 15 Minutes. You will be logged out in {logoutCountdown} seconds.
                        </dialog_1.DialogDescription>
                    </dialog_1.DialogHeader>
                    <div className="mt-4 flex space-x-2 dialog-footer">
                        <button className="btn-primary" onClick={handleStayLoggedIn}>
                            Stay logged in
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </dialog_1.DialogContent>
            </dialog_1.Dialog>
            {children}
        </AuthContext.Provider>);
};
exports.AuthProvider = AuthProvider;
var useAuth = function () {
    var context = (0, react_1.useContext)(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
exports.useAuth = useAuth;
