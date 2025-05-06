// src/components/ProgressStepper.tsx

import React from 'react';
import { Check } from 'lucide-react'; // Import checkmark icon

type StepperProps = {
    steps: string[]; // Array of step labels
    currentStep: number; // Index of the current step (0-based)
    direction?: 'horizontal' | 'vertical'; // New prop for direction
};

/**
 * ProgressStepper renders a sequence of steps. Can be horizontal or vertical.
 * The `currentStep` prop determines which step is currently highlighted.
 *
 * @param {string[]} steps - Array of step labels
 * @param {number} currentStep - Index of the current step (0-based)
 * @param {'horizontal' | 'vertical'} [direction='horizontal'] - Layout direction
 * @returns {React.ReactElement}
 */
const ProgressStepper: React.FC<StepperProps> = ({
    steps,
    currentStep,
    direction = 'horizontal' // Default to horizontal
}) => {
    if (!Array.isArray(steps) || steps.length === 0) {
        return <p className="text-sm text-gray-500">No progress steps available.</p>;
    }

    // Ensure currentStep is within the valid range of indices
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    const isProcessComplete = safeStep === steps.length - 1; // Check if the current step is the last step

    const isVertical = direction === 'vertical';

    // Container classes based on direction
    const containerClasses = `flex ${isVertical ? 'flex-col' : 'items-center overflow-x-auto pb-4'} px-2`;

    return (
        <div className={containerClasses}>
            {steps.map((step, index) => {
                const isCompletedPast = index < safeStep; // Step is strictly before the current one
                const isCurrent = index === safeStep; // This is the current step
                const isLastStep = index === steps.length - 1; // This step is the last one in the list

                // Determine color classes:
                // Green for steps before current AND for the last step if the process is complete
                // Blue for the current step, UNLESS it's the last step in a completed process
                // Gray for future steps
                const circleClasses = `rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold shrink-0
                    ${(isCompletedPast || (isCurrent && isProcessComplete)) ? 'bg-lime-green text-white' // Green for completed steps or the final active step
                        : isCurrent ? 'bg-electric-blue text-white' // Blue for the current step (if not the final one)
                            : 'bg-gray-200 text-gray-600'} // Gray for future steps
                `;

                const labelClasses = `mt-2 whitespace-nowrap text-xs text-center
                    ${isVertical ? 'whitespace-normal text-left w-auto min-w-[100px] mt-0 ml-3' : ''} {/* Adjust for vertical layout */}
                    ${(isCompletedPast || (isCurrent && isProcessComplete)) ? 'text-gray-700 font-medium' // Darker grey/medium font for completed steps
                        : isCurrent ? 'text-gray-900 font-semibold' // Darkest grey/bold font for the current step
                            : 'text-gray-500 font-medium'} // Lighter grey/medium font for future steps
                 `;

                const stepContainerClasses = `flex ${isVertical ? 'flex-row items-center' : 'flex-col items-center min-w-[80px] text-center'} text-center`;


                return (
                    <React.Fragment key={index}>
                        <div className={stepContainerClasses}>
                            <div className={circleClasses}>
                                {/* Display checkmark for completed steps (including the final one), number otherwise */}
                                {(isCompletedPast || (isCurrent && isProcessComplete)) ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            {/* Vertical label is alongside the circle */}
                            {isVertical && <span className={labelClasses}>{step}</span>}
                        </div>
                        {/* Connector Line between steps (do not render after the last step) */}
                        {!isLastStep && (
                            <div className={`
                                ${isVertical ? 'w-1 h-6 mx-auto ml-4 -my-1 shrink-0' : 'flex-grow h-1 mx-1'} {/* Adjust for vertical layout */}
                                ${(isCompletedPast || (isCurrent && isProcessComplete)) ? 'bg-lime-green' : 'bg-gray-300'}
                            `} />
                        )}
                        {/* Horizontal label is below the circle */}
                        {!isVertical && (
                            <span className={labelClasses}>
                                {step}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default ProgressStepper;