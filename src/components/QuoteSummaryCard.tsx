import dynamic from "next/dynamic";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderContext } from "@/contexts/OrderContext";

const Image = dynamic(() => import("next/image"), { ssr: false });

interface QuoteSummaryCardProps {
    repairType: string;
    notes: string;
}

const QuoteSummaryCard: React.FC<QuoteSummaryCardProps> = ({ repairType, notes }) => {
    const { order } = useOrderContext();

    return (
        <Card className="w-full md:max-w-xl shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="font-semibold text-jet-black">Repair Type:</p>
                    <p className="text-gray-600">{repairType || "Not selected"}</p>
                </div>
                <div>
                    <p className="font-semibold text-jet-black">Notes:</p>
                    <p className="text-gray-600">{notes || "None"}</p>
                </div>
                {order?.images?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {order.images.map((url: string, idx: number) => (
                            <div key={idx} className="relative h-24 w-full rounded overflow-hidden border">
                                <img
                                    src={url}
                                    alt={`Uploaded ${idx}`}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No images uploaded yet.</p>
                )}
            </CardContent>
        </Card>
    );
};

export default QuoteSummaryCard;
