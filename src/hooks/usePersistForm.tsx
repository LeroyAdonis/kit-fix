import { useEffect } from 'react';

const STORAGE_KEY = "kitfix-schedule-service";

export const usePersistForm = (form: any) => {
    useEffect(() => {
        const subscription = form.watch(values => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        });
        return () => subscription.unsubscribe();
    }, [form]);
};
