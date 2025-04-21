// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { logoutUser } from "@/services/authService";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { se } from "date-fns/locale";
import { useLocation } from "react-router-dom";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInactive: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInactive: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useRedirect = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    useEffect(() => {
        if (location.pathname !== "/" && !user) {
            navigate("/");
        }
    }, [location, user, navigate]);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInactive, setIsInactive] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(30);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("[AuthContext] Firebase user changed:", firebaseUser);

            if (!firebaseUser) {
                Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("kitfix-")) {
                        localStorage.removeItem(key);
                    }
                });
                logoutUser();
                setIsInactive(false);
                setDialogOpen(false);
            }

            setUser(firebaseUser);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let timeoutId: number | null = null;

        if (user && !isInactive) {
            timeoutId = window.setTimeout(() => {
                setIsInactive(true);
                setDialogOpen(true);
            }, 900000); // 30 seconds
        }

        return () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [isInactive, user]);

    const navigate = useNavigate();

    useEffect(() => {
        if (isInactive && dialogOpen) {
            const intervalId = setInterval(() => {
                setLogoutCountdown((prevCountdown) => {
                    if (prevCountdown === 0) {
                        logoutUser();
                        setIsInactive(false);
                        setDialogOpen(false);
                        navigate("/login");
                        return 30;

                    }

                    return prevCountdown - 1;
                });
            }, 1000);

            return () => clearInterval(intervalId);
        }
    }, [isInactive, dialogOpen]);

    const handleStayLoggedIn = () => {
        setIsInactive(false);
        setDialogOpen(false);
        setLogoutCountdown(30);
    };

    const handleLogout = () => {
        logoutUser();
        setIsInactive(false);
        setDialogOpen(false);
        setLogoutCountdown(30);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                isInactive,
            }}
        >
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Would you like to stay logged in?</DialogTitle>
                        <DialogDescription>
                            You have been inactive for 15 Minutes. You will be logged out in {logoutCountdown} seconds.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex space-x-2 dialog-footer">
                        <button className="btn-primary" onClick={handleStayLoggedIn}>
                            Stay logged in
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};


