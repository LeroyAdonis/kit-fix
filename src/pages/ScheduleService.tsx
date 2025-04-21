import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { set } from "date-fns";

const ScheduleService = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");
    const userData = JSON.parse(
        localStorage.getItem(`kitfix-user-${auth.currentUser?.uid}`) || "{}"
    );
    const ordersData = JSON.parse(
        localStorage.getItem(`kitfix-orders-${auth.currentUser?.uid}`) || "[]"
    );

    const scheduleSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        phone: z.string().min(10, "Phone number is required"),
        deliveryMethod: z.enum(["pickup", "dropoff"]),
        deliveryAddress: z.string().optional(),
        repairType: z.string().min(1, "Repair type is required"),
        preferredDate: z.string().min(1, "Preferred date is required")
    });

    type ScheduleFormData = z.infer<typeof scheduleSchema>;

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        setValue
    } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            deliveryMethod: "pickup"
        }
    });

    const deliveryMethod = watch("deliveryMethod");

    useEffect(() => {
        const fetchData = async () => {
            if (orderId) {
                try {
                    const orderRef = doc(db, "orders", orderId);
                    const orderSnap = await getDoc(orderRef);

                    if (orderSnap.exists()) {
                        const data = orderSnap.data();
                        setInitialData({ ...data, orderId });
                        const contact = data.contactInfo || {};
                        const processing = data.processing || {};
                        console.log(orderId);
                        setValue("name", contact.name || "");
                        setValue("email", contact.email || "");
                        setValue("phone", contact.phone || "");
                        setValue(
                            "repairType" as keyof ScheduleFormData,
                            data.repairType + " - " + data.repairDescription || ""
                        );
                        setValue("deliveryMethod", processing.deliveryMethod || "pickup");
                        setValue("deliveryAddress", processing.deliveryAddress || "");
                        setValue(
                            "preferredDate",
                            processing.deliveryDate?.split("T")[0] || ""
                        );
                    } else {
                        toast.error("Order not found. Please restart the repair process.");
                        navigate("/dashboard");
                    }
                } catch (error) {
                    console.error("Error fetching order:", error);
                    toast.error("Failed to load order. Please try again.");
                }
            } else {
                const saved = localStorage.getItem("kitfix-quote-data");
                if (saved) {
                    const data = JSON.parse(saved);
                    setInitialData(data);
                    setValue("name", data?.name || "");
                    setValue("email", data?.email || "");
                    setValue("phone", data?.phone || "");
                    setValue("deliveryMethod", data?.deliveryMethod || "pickup");
                    setValue("deliveryAddress", data?.deliveryAddress || "");
                    setValue("preferredDate", data?.preferredDate || "");
                } else {
                    toast.error("Missing order info. Please restart your repair.");
                    navigate("/dashboard");
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [orderId, setValue, navigate]);

    const onSubmit = async (formData: ScheduleFormData) => {
        const finalOrderId = orderId || initialData?.orderId;
        if (!finalOrderId) {
            toast.error("Order ID not found. Please restart your repair.");
            return;
        }

        try {
            const orderRef = doc(db, "orders", finalOrderId);

            const isPickup = formData.deliveryMethod === "pickup";

            const updatedData = {
                contactInfo: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                },
                processing: {
                    deliveryMethod: formData.deliveryMethod,
                    deliveryAddress: isPickup ? formData.deliveryAddress : "",
                    deliveryDate: isPickup ? formData.preferredDate : null,
                    preferredDate: formData.preferredDate, // always save this
                    dropoffDate: !isPickup ? new Date().toISOString() : null,
                    pickupStatus: isPickup ? "pending" : null,
                    dropoffStatus: !isPickup ? "received" : null,
                    deliveryStatus: isPickup ? "scheduled" : null,
                },
                repairType: formData.repairType,
                status: "in-progress",
                stepCompleted: "schedule",
            };

            await updateDoc(orderRef, updatedData);

            localStorage.setItem(
                "kitfix-order",
                JSON.stringify({
                    ...initialData,
                    ...formData,
                    stepCompleted: "schedule",
                })
            );

            toast.success("Schedule saved! Proceeding to payment...");
            navigate(`/payment?orderId=${finalOrderId}`);
        } catch (error) {
            console.error("Error saving schedule info:", error);
            toast.error("Something went wrong while saving. Please try again.");
        }
    };


    if (loading) return <p>Loading...</p>;

    return (
        <div className='min-h-screen flex flex-col'>
            <Header />
            <main className='flex-grow py-16 px-4'>
                <div className='container-custom max-w-3xl'>
                    <div className='glass-card p-8'>
                        <h1 className='text-2xl font-bold mb-4'>Schedule Your Repair</h1>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <div>
                                <label className='block font-medium'>Full Name</label>
                                <input
                                    {...register("name")}
                                    className='w-full border p-2 rounded'
                                />
                                {errors.name && (
                                    <p className='text-red-500'>{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className='block font-medium'>Email</label>
                                <input
                                    type='email'
                                    {...register("email")}
                                    className='w-full border p-2 rounded'
                                />
                                {errors.email && (
                                    <p className='text-red-500'>{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className='block font-medium'>Phone</label>
                                <input
                                    type='tel'
                                    {...register("phone")}
                                    className='w-full border p-2 rounded'
                                />
                                {errors.phone && (
                                    <p className='text-red-500'>{errors.phone.message}</p>
                                )}
                            </div>

                            <div>
                                <label className='block font-medium'>Repair Type</label>
                                <input
                                    type='repairType'
                                    {...register("repairType")}
                                    className='w-full border p-2 rounded'
                                />
                                {errors.repairType && (
                                    <p className='text-red-500'>{errors.repairType.message}</p>
                                )}

                            </div>

                            <div>
                                <label className='block font-medium'>Delivery Method</label>
                                <select
                                    {...register("deliveryMethod")}
                                    className='w-full border p-2 rounded'
                                >
                                    <option value='pickup'>Pickup</option>
                                    <option value='dropoff'>Dropoff</option>
                                </select>
                            </div>

                            {deliveryMethod === "pickup" && (
                                <div>
                                    <label className='block font-medium'>Pickup Address</label>
                                    <input
                                        {...register("deliveryAddress")}
                                        className='w-full border p-2 rounded'
                                    />
                                </div>
                            )}

                            <div>
                                <label className='block font-medium'>Preferred Date</label>
                                <input
                                    type='date'
                                    {...register("preferredDate")}
                                    className='w-full border p-2 rounded'
                                />
                                {errors.preferredDate && (
                                    <p className='text-red-500'>{errors.preferredDate.message}</p>
                                )}
                            </div>

                            <button
                                type='submit'
                                className='bg-electric-blue text-white px-4 py-2 rounded hover:bg-blue-600'
                            >
                                Continue to Payment
                            </button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ScheduleService;
