// context/OrderContext.tsx
import React, { createContext, useContext, useState } from "react";

// Define the types for your context
interface OrderContextType {
    uploadedImages: string[];
    setUploadedImages: (images: string[]) => void;
    orderId: string;
    setOrderId: (id: string) => void;
    repairType: string;
    setRepairType: (repair: string) => void;
    notes: string;
    setNotes: (notes: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [orderId, setOrderId] = useState<string>("");
    const [repairType, setRepairType] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    return (
        <OrderContext.Provider
            value={{
                uploadedImages,
                setUploadedImages,
                orderId,
                setOrderId,
                repairType,
                setRepairType,
                notes,
                setNotes,
            }}
        >
            {children}
        </OrderContext.Provider>
    );
};

export const useOrderContext = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error("useOrderContext must be used within an OrderProvider");
    }
    return context;
};
