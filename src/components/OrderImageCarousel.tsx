// components/OrderImageCarousel.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderImageCarouselProps {
    images: string[];
}

const OrderImageCarousel: React.FC<OrderImageCarouselProps> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const prevImage = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const nextImage = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    if (!images || images.length === 0) return null;

    return (
        <div className="w-full max-w-md mx-auto relative">
            <div className="aspect-w-4 aspect-h-3 overflow-hidden rounded-2xl border shadow-md">
                <img
                    src={images[currentIndex]}
                    alt={`Jersey Image ${currentIndex + 1}`}
                    className="object-contain w-full h-full mx-auto"
                    style={{
                        maxHeight: "calc(100vh - 500px)",
                        maxWidth: "calc(100vw - 500px)",
                    }}
                />
            </div>

            {/* Navigation Buttons */}
            <div className="absolute inset-y-0 left-0 flex items-center">
                <Button className="hover:shadow rounded-full" variant="ghost" size="icon" onClick={prevImage}>
                    <ChevronLeft />
                </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
                <Button className="hover:shadow rounded-full" variant="ghost" size="icon" onClick={nextImage}>
                    <ChevronRight />
                </Button>
            </div>

            {/* Image Indicator */}
            <div className="flex justify-center mt-2 space-x-1">
                {images.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${index === currentIndex ? "bg-electric-blue" : "bg-gray-300"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default OrderImageCarousel;

