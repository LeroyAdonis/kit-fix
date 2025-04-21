import React from 'react';

type StepperProps = {
    steps: string[];
    currentStep: number;
};

const ProgressStepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    if (!Array.isArray(steps) || steps.length === 0) {
        return <p className="text-sm text-gray-500">No progress steps available.</p>;
    }

    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));

    return (
        <div className="flex items-center gap-4 overflow-x-auto p-2">
            {steps.map((step, index) => {
                const isActive = index === safeStep;
                const isCompleted = index < safeStep;

                return (
                    <div key={index} className="flex items-center">
                        <div
                            className={`rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold
                ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-electric-blue text-white' : 'bg-gray-200 text-gray-600'}
              `}
                        >
                            {index + 1}
                        </div>
                        <span
                            className={`ml-2 whitespace-nowrap text-sm font-medium ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                                }`}
                        >
                            {step}
                        </span>
                        {index !== steps.length - 1 && (
                            <div className="mx-3 h-1 w-8 bg-gray-300" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressStepper;
