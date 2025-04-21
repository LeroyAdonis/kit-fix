// admin/components/StatusFilter.tsx
import React from "react";
import { Label } from "@/components/ui/label";

interface StatusFilterProps {
    statuses: string[];
    selectedStatus: string;
    onChange: (status: string) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ statuses, selectedStatus, onChange }) => {
    return (
        <div className="flex items-center gap-4 mb-4">
            <Label>Status:</Label>
            <select
                className="border rounded px-3 py-1"
                value={selectedStatus}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="all">All</option>
                {statuses.map((status) => (
                    <option key={status} value={status}>
                        {status[0].toUpperCase() + status.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default StatusFilter;
