// components/RepairTimeline.tsx
import React from "react";
import { format } from "date-fns";
import { CalendarCheck2, Clock8 } from "lucide-react";

interface RepairTimelineProps {
    order: any;
}

const formatTimestamp = (value: any) => {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value.toDate();
    return format(date, "dd MMM yyyy, HH:mm");
};

const RepairTimeline: React.FC<RepairTimelineProps> = ({ order }) => {
    return (
        <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Repair Timeline</h3>
            <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                    <CalendarCheck2 className="w-4 h-4 text-electric-blue" />
                    <span>Order Placed:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.orderDate)}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-electric-blue" />
                    <span>Payment Received:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.payment?.paidAt)}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-electric-blue" />
                    <span>Repair Scheduled:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.repairTimestamps?.scheduledAt)}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-electric-blue" />
                    <span>Repair Started:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.repairProgress?.startedAt)}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-electric-blue" />
                    <span>Repair Completed:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.repairProgress?.completedAt)}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-electric-blue" />
                    <span>Last Updated:</span>
                    <span className="ml-auto font-medium">
                        {formatTimestamp(order.repairTimestamps?.updatedAt)}
                    </span>
                </li>
            </ul>
        </div>
    );
};

export default RepairTimeline;
