// src/pages/UploadPhotos.tsx
import React, { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Use sonner toast
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Camera, Upload, X, Loader2 } from 'lucide-react'; // Import Loader2
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import firebaseConfig from '@/firebaseConfig';
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebaseConfig";
// import { useOrderContext } from "@/contexts/OrderContext"; // Remove if not used

// Import Order type and relevant statuses
import { Order, OrderStatus, RepairStatus, PaymentStatus } from '@/types/order';


const storage = getStorage(firebaseConfig);
const db = getFirestore(firebaseConfig); // Use db from firebaseConfig directly if exported


/**
 * Page for uploading photos of a jersey for repair.
 *
 * Creates a new order document in Firestore with uploaded photo URLs and
 * initializes essential fields for the order processing workflow.
 */

const UploadPhotos = () => {
    // useOrderContext(); // Remove if not used

    const navigate = useNavigate();
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploading, setUploading] = useState(false); // State for upload and order creation
    const [user, loadingUser, errorUser] = useAuthState(auth); // Use useAuthState hook

    // --- Handle file input change ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addPhotos(newFiles);
        }
    };

    // --- Add photos to state ---
    const addPhotos = (files: File[]) => {
        // Only accept image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            toast.error('Please upload image files only');
            return;
        }

        if (photos.length + imageFiles.length > 5) {
            toast.warning(`You can upload a maximum of 5 photos. ${5 - photos.length} slots remaining.`);
            // Optionally truncate the array if more than 5 were selected at once
            const allowedFiles = imageFiles.slice(0, 5 - photos.length);
            const newPreviews = allowedFiles.map(file => URL.createObjectURL(file));
            setPhotos([...photos, ...allowedFiles]);
            setPreviews([...previews, ...newPreviews]);
            if (imageFiles.length > allowedFiles.length) {
                toast.info(`Added ${allowedFiles.length} photos. Skipped ${imageFiles.length - allowedFiles.length} due to the 5 photo limit.`);
            } else {
                toast.success(`${allowedFiles.length} photo${allowedFiles.length > 1 ? 's' : ''} added`);
            }

        } else {
            // Create preview URLs
            const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
            setPhotos([...photos, ...imageFiles]);
            setPreviews([...previews, ...newPreviews]);
            toast.success(`${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''} added`);
        }
    };

    // --- Remove photo from state ---
    const removePhoto = (index: number) => {
        // Revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);

        const newPhotos = [...photos];
        const newPreviews = [...previews];

        newPhotos.splice(index, 1);
        newPreviews.splice(index, 1);

        setPhotos(newPhotos);
        setPreviews(newPreviews);
        toast.info('Photo removed');
    };

    // --- Handle drag events ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    // --- Handle drop event ---
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            addPhotos(droppedFiles);
        }
    };

    // Clean up object URLs when component unmounts or previews change
    useEffect(() => {
        return () => {
            previews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [previews]);


    // --- Handle form submission (Upload and Create Order) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (photos.length === 0) {
            toast.error('Please upload at least one photo of your jersey');
            return;
        }

        if (!user) {
            toast.error("You must be logged in to create an order.");
            // Optionally redirect to login
            // navigate('/login');
            return;
        }

        setUploading(true); // Start uploading state
        setUploadProgress(0); // Reset progress

        try {
            console.log("Uploading images...");
            const downloadURLs = await Promise.all(
                photos.map(photo => {
                    // Create a storage reference with a unique name including user ID and timestamp
                    const uniqueName = `${user.uid}_${Date.now()}_${photo.name.replace(/\s+/g, '_')}`; // Replace spaces
                    const storageRef = ref(storage, `jerseys/${uniqueName}`);
                    const uploadTask = uploadBytesResumable(storageRef, photo);

                    return new Promise<string>((resolve, reject) => {
                        uploadTask.on(
                            'state_changed',
                            (snapshot) => {
                                // Update progress (can be tricky with Promise.all for total progress)
                                // For simplicity, maybe just show a general loading or progress for the first file
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                // If you want overall progress, you'd need to track bytes across all uploads
                                // For now, let's update a general progress indicator
                                setUploadProgress(prev => {
                                    // Simple average or just use the last file's progress
                                    return prev + (progress - prev) / photos.length; // Very basic average approximation
                                });
                            },
                            (error) => {
                                console.error("Upload error for", photo.name, error);
                                toast.error(`Failed to upload ${photo.name}.`);
                                reject(error); // Reject the promise on error
                            },
                            async () => {
                                try {
                                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                    console.log("Uploaded", photo.name, "->", downloadURL);
                                    resolve(downloadURL); // Resolve with the download URL
                                } catch (error) {
                                    console.error("Error getting download URL for", photo.name, error);
                                    toast.error(`Failed to get URL for ${photo.name}.`);
                                    reject(error); // Reject the promise on error
                                }
                            }
                        );
                    });
                })
            );

            console.log("All images uploaded. Download URLs:", downloadURLs);

            if (!downloadURLs || downloadURLs.length === 0 || downloadURLs.some(url => !url)) {
                throw new Error("Failed to get download URLs for all images.");
            }


            console.log("Creating initial order document in Firestore...");

            // --- Create the initial order document aligning with the Order type ---
            const newOrder: Omit<Order, 'id'> = { // Omit 'id' as addDoc generates it
                userId: user.uid, // User ID from auth state

                contactInfo: { // Initialize contact info - will be filled later
                    name: "",
                    email: user.email || "", // Pre-fill email if available
                    phone: "",
                    address: "",
                },

                repairType: "", // Will be set in GetQuote
                repairDescription: "", // Will be set in GetQuote
                price: 0, // Will be set in GetQuote
                notes: "", // Will be set in GetQuote

                photos: downloadURLs, // Save all download URLs here

                processing: { // Initialize processing fields
                    status: "pending" as OrderStatus, // <-- Initial status for OrdersTable
                    repairStatus: "Pending Routing" as RepairStatus, // <-- Initial status before admin routes

                    deliveryMethod: "" as DeliveryMethod, // Will be set in ScheduleService
                    duration: "", // Will be set in GetQuote
                    preferredDate: "", // Will be set in ScheduleService

                    // Do NOT initialize method-specific statuses here.
                    // They should be set in ScheduleService based on the chosen method.
                    // pickupStatus: undefined,
                    // dropoffStatus: undefined,
                    // deliveryStatus: undefined,

                    // Location/date fields also initialized later
                    // scheduledDropoffDate: undefined,
                    // actualDropoffDate: undefined,
                    // scheduledPickupDate: undefined,
                    // actualPickupDate: undefined,
                    // scheduledDeliveryDate: undefined,
                    // actualDeliveryDate: undefined,
                    // dropoffLocation: undefined,
                    // pickupLocation: undefined,
                    // deliveryAddress: undefined, // Redundant with contactInfo.address
                },

                payment: { // Initialize payment fields
                    amount: 0, // Set price in GetQuote
                    status: "unpaid" as PaymentStatus, // Initially unpaid
                    method: null,
                    reference: null,
                    paidAt: null,
                },

                // Remove redundant top-level status and paid fields

                createdAt: serverTimestamp(), // Set creation timestamp
                updatedAt: serverTimestamp(), // Set initial update timestamp

                // Remove history object for now if not strictly needed in this structure
                // history: {} // Remove if not used or structure differently
            };

            // Use addDoc to create the document with an auto-generated ID
            const orderRef = await addDoc(collection(db, "orders"), newOrder);

            console.log("Order document created with ID:", orderRef.id);

            toast.success("Photos uploaded and initial order created!");

            // Clean up local preview URLs
            previews.forEach(preview => URL.revokeObjectURL(preview));
            setPhotos([]); // Clear local photo state
            setPreviews([]);

            // Navigate to the next step, passing the new order ID via URL params
            navigate(`/get-quote?orderId=${orderRef.id}`);

        } catch (error) {
            console.error("Upload/Order Creation Error:", error);
            // Check if the error is a FirebaseError
            if (errorUser) { // Error from useAuthState
                toast.error("Authentication error: Please log in.", { description: errorUser.message });
            } else if (error instanceof Error) { // General JS error or our custom error
                toast.error("Order creation failed", { description: error.message });
            } else { // Unknown error type
                toast.error("An unexpected error occurred.");
            }

        } finally {
            setUploading(false); // Ensure uploading state is off
            setUploadProgress(0); // Reset progress display
        }
    };

    // Show loading state while checking user auth
    if (loadingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
        );
    }

    // Show error if user auth failed
    if (errorUser) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600">
                Error loading user: {errorUser.message}
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-16 px-4">
                <div className="container-custom max-w-3xl">
                    <div className="glass-card p-8">
                        <h1 className="heading-lg text-center mb-2">Upload Photos</h1>
                        <p className="text-gray-600 text-center mb-8">
                            Please upload clear photos of your damaged jersey from multiple angles
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-electric-blue bg-blue-50' : 'border-gray-300'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                            >
                                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h2 className="heading-sm mb-2">Drag & Drop Photos Here</h2>
                                <p className="text-gray-500 mb-4">or</p>

                                <div className="flex justify-center">
                                    <div className="relative">
                                        {/* Disable input if max photos reached */}
                                        {photos.length < 5 && (
                                            <Input
                                                id="photo-upload"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                onChange={handleFileChange}
                                                disabled={uploading} // Disable during upload
                                            />
                                        )}
                                        <Button type="button" variant="outline" disabled={photos.length >= 5 || uploading}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            {photos.length >= 5 ? 'Max Photos Reached' : 'Browse Files'}
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 mt-4">
                                    Upload up to 5 JPG or PNG images
                                </p>
                            </div>

                            {previews.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="heading-sm">Uploaded Photos ({previews.length}/5)</h3>
                                    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${previews.length > 3 ? 'overflow-x-auto' : ''}`}> {/* Added overflow class */}
                                        {previews.map((preview, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={preview}
                                                    alt={`Jersey photo ${index + 1}`}
                                                    className="w-full h-40 object-cover rounded-lg"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                                                    onClick={() => removePhoto(index)}
                                                    disabled={uploading} // Disable removal during upload
                                                >
                                                    <X className="h-4 w-4 text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={() => navigate('/')} disabled={uploading}>
                                    Back to Home
                                </Button>
                                <Button type="submit" disabled={photos.length === 0 || uploading}>
                                    {uploading ? (
                                        <div className="flex items-center">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading... {uploadProgress > 0 ? `${uploadProgress.toFixed(0)}%` : ''} {/* Show progress if > 0 */}
                                        </div>
                                    ) : 'Continue to Get Quote'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default UploadPhotos;