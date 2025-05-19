import { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import HowItWorks from '@/components/HowItWorks';
import CustomerReviews from '@/components/CustomerReviews';
import CallToAction from '@/components/CallToAction';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';

const Index = () => {
    // Smooth scroll to sections when URL contains a hash or when hash changes
    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash) {
                const id = window.location.hash.substring(1);
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };
        handleHashChange(); // Run on mount
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main>
                <Hero />
                <Services />
                <HowItWorks />
                <CustomerReviews />
                <CallToAction />
                <ContactForm />
            </main>
            <Footer />
        </div>
    );
};

export default Index;