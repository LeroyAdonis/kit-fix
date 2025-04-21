"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var AuthContext_1 = require("../contexts/AuthContext");
var AuthLayout = function () {
    var _a = (0, AuthContext_1.useAuth)(), user = _a.user, isAuthenticated = _a.isAuthenticated, isLoading = _a.isLoading;
    var location = (0, react_router_dom_1.useLocation)();
    // If authentication is loading, show loading spinner
    if (isLoading) {
        console.log("isLoading:", isLoading);
        return (<div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>);
    }
    // If user is authenticated and trying to access login/register, redirect to dashboard
    if (isAuthenticated && location.pathname === '/dashboard') {
        console.log('isAuthenticated:', isAuthenticated, 'location.pathname:', location.pathname);
        return <react_router_dom_1.Outlet />;
    }
    else if (isAuthenticated && ['/login', '/register'].includes(location.pathname)) {
        return <react_router_dom_1.Navigate to="/dashboard" replace/>;
    }
    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!isAuthenticated && location.pathname === '/dashboard') {
        console.log('isAuthenticated:', isAuthenticated, 'location.pathname:', location.pathname);
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    return <react_router_dom_1.Outlet />;
};
exports.default = AuthLayout;
