import { Mail, Phone, MapPin } from 'lucide-react';

const ContactInfo = () => {
    return (
        <div className="glass-card glass-card-primary p-8 bg-gradient-primary animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="heading-sm mb-6 text-pure-white text-left">Contact Information</h3>

            <div className="space-y-6">
                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <Mail className="text-pure-white h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Email Us</p>
                        <a href="mailto:info@kitfix.com" className="text-pure-white hover:text-pure-white/80 transition-colors duration-300 font-medium">
                            info@kitfix.co.za
                        </a>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <Phone className="text-pure-white h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Call Us</p>
                        <a href="tel:+15551234567" className="text-pure-white hover:text-pure-white/80 transition-colors duration-300 font-medium">
                            076 332 2026
                        </a>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <MapPin className="text-pure-white h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Visit Us</p>
                        <address className="text-pure-white not-italic">
                            66 Cathrine Road<br />
                            Fontainebleu, Randburg 2191
                        </address>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactInfo;