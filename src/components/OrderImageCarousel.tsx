// components/OrderImageCarousel.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
    images: string[];
};

const OrderImageCarousel = ({ images }: Props) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    if (!images || images.length === 0) return null;

    return (
        <div className="mt-4 relative">
            <div className="w-full h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border relative overflow-hidden">
                {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-electric-blue" />
                    </div>
                )}
                <img
                    src={images[currentImageIndex]}
                    alt={`Jersey ${currentImageIndex + 1}`}
                    onLoad={() => setImageLoaded(true)}
                    className={`transition-opacity duration-500 w-full h-full object-contain rounded-lg ${imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                />
            </div>

            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setImageLoaded(false);
                            setCurrentImageIndex((prev) =>
                                prev === 0 ? images.length - 1 : prev - 1
                            );
                        }}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white shadow z-10 hover:cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setImageLoaded(false);
                            setCurrentImageIndex((prev) =>
                                prev === images.length - 1 ? 0 : prev + 1
                            );
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white shadow z-10 hover:cursor-pointer"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    );
};

export default OrderImageCarousel;
