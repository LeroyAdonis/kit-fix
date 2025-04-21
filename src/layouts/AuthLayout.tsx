import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthLayout = () => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    const protectedRoutes = ['/dashboard', '/schedule-service'];

    // Show loading spinner while checking auth
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    // Redirect logged-in users away from login/register
    if (isAuthenticated && ['/login', '/register'].includes(location.pathname)) {
        return <Navigate to="/dashboard" replace />;
    }

    // Protect dashboard and schedule-service
    if (!isAuthenticated && protectedRoutes.includes(location.pathname)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default AuthLayout;
