import React from "react";
import { User } from "firebase/auth";
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInactive: boolean;
}
export declare const AuthProvider: ({ children }: {
    children: React.ReactNode;
}) => any;
export declare const useAuth: () => AuthContextType;
export {};
