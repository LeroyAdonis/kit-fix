// src/components/ProgressStepper.tsx
import React from 'react';
import { Check } from 'lucide-react'; // Import checkmark icon

type StepperProps = {
    steps: string[];
    currentStep: number;
};

const ProgressStepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    if (!Array.isArray(steps) || steps.length === 0) {
        return <p className="text-sm text-gray-500">No progress steps available.</p>;
    }

    // Ensure currentStep is within the valid range of indices
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));

    return (
        // Use flex-nowrap to prevent wrapping, ensure padding for scroll indicator
        <div className="flex items-center overflow-x-auto pb-4 px-2"> {/* Added pb-4 for scrollbar visibility, px-2 for edge padding */}
            {steps.map((step, index) => {
                const isActive = index === safeStep;
                const isCompleted = index < safeStep;
                const isLastStep = index === steps.length - 1;

                return (
                    <React.Fragment key={index}> {/* Use Fragment to avoid extra div around segments */}
                        <div className="flex flex-col items-center min-w-[80px] text-center"> {/* Added min-width and center text */}
                            {/* Circle */}
                            <div
                                className={`rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold shrink-0 {/* Added shrink-0 */}
                                    ${isCompleted ? 'bg-lime-green text-white' : isActive ? 'bg-electric-blue text-white' : 'bg-gray-200 text-gray-600'}
                                `}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : index + 1} {/* Use checkmark for completed */}
                            </div>
                            {/* Label */}
                            <span
                                className={`mt-2 whitespace-nowrap text-xs font-medium text-center {/* Adjusted margin, text size, and center */}
                                    ${isCompleted ? 'text-gray-700' : isActive ? 'text-gray-900 font-semibold' : 'text-gray-500'}
                                `}
                            >
                                {step}
                            </span>
                        </div>
                        {/* Connector Line */}
                        {!isLastStep && (
                            <div className={`flex-grow h-1 mx-1 {/* Adjusted margin */}
                                ${isCompleted ? 'bg-lime-green' : 'bg-gray-300'}
                            `} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default ProgressStepper;