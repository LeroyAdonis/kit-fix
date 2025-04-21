import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Camera, Upload, X } from 'lucide-react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import firebaseConfig from '@/firebaseConfig';
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebaseConfig";
import { useOrderContext } from "@/contexts/OrderContext";


const storage = getStorage(firebaseConfig);

const UploadPhotos = () => {
    useOrderContext();

    const navigate = useNavigate();
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploading, setUploading] = useState(false);
    const db = getFirestore(firebaseConfig);
    const [user] = useAuthState(auth);

    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            addPhotos(newFiles);
        }
    };

    // Add photos to state
    const addPhotos = (files: File[]) => {
        // Only accept image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            toast.error('Please upload image files only');
            return;
        }

        if (photos.length + imageFiles.length > 5) {
            toast.error('You can upload a maximum of 5 photos');
            return;
        }

        // Create preview URLs
        const newPreviews = imageFiles.map(file => URL.createObjectURL(file));

        setPhotos([...photos, ...imageFiles]);
        setPreviews([...previews, ...newPreviews]);

        toast.success(`${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''} added`);
    };

    // Remove photo from state
    const removePhoto = (index: number) => {
        // Revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);

        const newPhotos = [...photos];
        const newPreviews = [...previews];

        newPhotos.splice(index, 1);
        newPreviews.splice(index, 1);

        setPhotos(newPhotos);
        setPreviews(newPreviews);
    };

    // Handle drag events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    // Handle drop event
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            addPhotos(droppedFiles);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (photos.length === 0) {
            toast.error('Please upload at least one photo of your jersey');
            return;
        }

        setUploading(true);

        try {
            const downloadURLs = await Promise.all(
                photos.map(photo => {
                    const uniqueName = `${user?.uid}_${Date.now()}_${photo.name}`;
                    const storageRef = ref(storage, `jerseys/${uniqueName}`);
                    const uploadTask = uploadBytesResumable(storageRef, photo);

                    return new Promise<string>((resolve, reject) => {
                        uploadTask.on(
                            'state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                setUploadProgress(progress);
                            },
                            (error) => {
                                reject(error);
                            },
                            async () => {
                                try {
                                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                    resolve(downloadURL);
                                } catch (error) {
                                    reject(error);
                                }
                            }
                        );
                    });
                })
            );

            // ✅ Then proceed with Firestore order creation
            console.log("Current user UID:", user?.uid);
            console.log("Download URLs:", downloadURLs);

            if (!user?.uid) {
                throw new Error("User not logged in");
            }

            if (!downloadURLs || downloadURLs.length === 0) {
                throw new Error("No uploaded images found");
            }

            const orderRef = await addDoc(collection(db, "orders"), {
                userId: user?.uid,
                jerseyImageUrl: downloadURLs[0],
                allImages: downloadURLs,
                orderDate: serverTimestamp(),
                status: "draft",
                paid: false,
                stepCompleted: "upload", // you can update this throughout the process
                notes: "",
            });


            toast.success("Photos uploaded and order created!");
            setTimeout(() => {
                navigate('/get-quote', {
                    state: {
                        orderId: orderRef.id,
                        photos: downloadURLs,
                        orderDate: serverTimestamp(),
                    },
                });
            }, 100);

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload or create order. Please try again.");
        } finally {
            setUploading(false);
        }
    };

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
                                        <Input
                                            id="photo-upload"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            onChange={handleFileChange}
                                        />
                                        <Button type="button" variant="outline">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Browse Files
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 mt-4">
                                    Upload up to 5 JPG or PNG images (max 5MB each)
                                </p>
                            </div>

                            {previews.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="heading-sm">Uploaded Photos ({previews.length}/5)</h3>
                                    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${previews.length > 3 ? 'overflow-x-auto' : ''}`}>
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
                                                >
                                                    <X className="h-4 w-4 text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                                    Back to Home
                                </Button>
                                <Button type="submit" disabled={photos.length === 0 || uploading}>
                                    {uploading ? `Uploading... ${uploadProgress.toFixed(2)}%` : 'Continue to Get Quote'}
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

