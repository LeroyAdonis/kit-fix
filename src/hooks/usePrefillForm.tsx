import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

const STORAGE_KEY = "kitfix-schedule-service";

export const usePrefillForm = (form: any, previousStepData: any) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true); // Adding loading state

    const loadUserData = async () => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            navigate('/login');
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        const mergedData: Partial<FormValues> = {
            name: userData.name || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
            suburb: userData.suburb || "",
            city: userData.city || "",
            province: userData.province || "",
            postalCode: userData.postalCode || "",
            deliveryMethod: userData.deliveryMethod || "pickup",
        };

        const currentValues = form.getValues();
        const shouldReset = Object.entries(mergedData).some(
            ([key, value]) => currentValues[key as keyof FormValues] !== value
        );

        const savedForm = localStorage.getItem(STORAGE_KEY);
        if (!savedForm && shouldReset) {
            form.reset({ ...currentValues, ...mergedData });
        }

        setIsLoading(false); // Set loading to false once data is fetched
    };

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.date) parsed.date = new Date(parsed.date);

            const currentValues = form.getValues();
            const isEmpty = Object.values(currentValues).every(val => val === "" || val === undefined || val === null);

            if (isEmpty) form.reset({ ...currentValues, ...parsed });
        }

        loadUserData();
    }, [form]);

    return { isLoading };
};
