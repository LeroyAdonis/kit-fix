/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

const STORAGE_KEY = "kitfix-schedule-service";

export const usePersistForm = (form: any) => {
    useEffect(() => {
        const subscription = form.watch((values: Record<string, any>) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        });
        return () => subscription.unsubscribe();
    }, [form]);
};
