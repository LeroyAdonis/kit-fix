"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var ContactInfo = function () {
    return (<div className="glass-card glass-card-primary p-8 bg-gradient-primary animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="heading-sm mb-6 text-pure-white text-left">Contact Information</h3>

            <div className="space-y-6">
                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <lucide_react_1.Mail className="text-pure-white h-6 w-6"/>
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Email Us</p>
                        <a href="mailto:info@kitfix.com" className="text-pure-white hover:text-pure-white/80 transition-colors duration-300 font-medium">
                            info@kitfix.com
                        </a>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <lucide_react_1.Phone className="text-pure-white h-6 w-6"/>
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Call Us</p>
                        <a href="tel:+15551234567" className="text-pure-white hover:text-pure-white/80 transition-colors duration-300 font-medium">
                            (555) 123-4567
                        </a>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="bg-pure-white-20 p-3 rounded-full mr-4">
                        <lucide_react_1.MapPin className="text-pure-white h-6 w-6"/>
                    </div>
                    <div>
                        <p className="text-pure-white/80 mb-1">Visit Us</p>
                        <address className="text-pure-white not-italic">
                            123 Jersey Lane<br />
                            Soccer City, SC 12345
                        </address>
                    </div>
                </div>
            </div>
        </div>);
};
exports.default = ContactInfo;
