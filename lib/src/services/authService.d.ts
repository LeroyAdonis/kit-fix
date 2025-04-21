export declare const registerUser: (email: string, password: string) => Promise<import("@firebase/auth").User>;
export declare const loginUser: (email: string, password: string) => Promise<import("@firebase/auth").User>;
export declare const logoutUser: () => Promise<void>;
