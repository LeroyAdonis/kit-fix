import React from "react";
import { CheckCircle, Clock, PackageCheck, Truck } from "lucide-react";

interface OrderStepTrackerProps {
    order: any;
}

/**
 * A component that displays a tracker for the current status of an order.
 *
 * @param {OrderStepTrackerProps} props
 * @prop {Order} order - The order to display the tracker for
 *
 * @returns {React.ReactElement}
 */
const OrderStepTracker: React.FC<OrderStepTrackerProps> = ({ order }) => {
    const { processing = {}, status = {} } = order;

    const isPickup = processing.deliveryMethod === "pickup";
    const isDropoff = processing.deliveryMethod === "dropoff";

    const steps = [
        {
            title: isPickup ? "Pickup Scheduled" : "Dropoff Scheduled",
            completed: isPickup
                ? processing.pickupStatus === "picked"
                : processing.dropoffStatus === "dropped",
            icon: <Truck className="w-5 h-5" />,
        },
        {
            title: "In Repair",
            completed: processing.status === "in_progress" || processing.status === "complete",
            icon: <PackageCheck className="w-5 h-5" />,
        },
        {
            title: isPickup ? "Delivered" : "Ready for Pickup",
            completed: isPickup
                ? processing.deliveryStatus === "delivered"
                : processing.deliveryStatus === "ready",
            icon: <CheckCircle className="w-5 h-5" />,
        },
    ];

    return (
        <div className="flex items-center space-x-4 overflow-x-auto">
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                return (
                    <div key={index} className="flex items-center space-x-2">
                        <div
                            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${step.completed
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-500"
                                }`}
                        >
                            {step.icon}
                            <span>{step.title}</span>
                        </div>
                        {!isLast && (
                            <div className="w-4 h-px bg-muted" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OrderStepTracker;
