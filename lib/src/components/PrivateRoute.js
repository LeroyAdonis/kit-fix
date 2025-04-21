"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/components/PrivateRoute.tsx
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("react-firebase-hooks/auth");
var firebaseConfig_1 = require("@/firebaseConfig");
var PrivateRoute = function (_a) {
    var children = _a.children;
    var _b = (0, auth_1.useAuthState)(firebaseConfig_1.auth), user = _b[0], loading = _b[1];
    if (loading)
        return <p>Loading...</p>;
    return user ? <>{children}</> : <react_router_dom_1.Navigate to="/login"/>;
};
exports.default = PrivateRoute;
