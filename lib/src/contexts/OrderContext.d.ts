import React from "react";
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
export declare const OrderProvider: ({ children }: {
    children: React.ReactNode;
}) => any;
export declare const useOrderContext: () => OrderContextType;
export {};
