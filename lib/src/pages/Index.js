"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var Header_1 = require("@/components/Header");
var Hero_1 = require("@/components/Hero");
var Services_1 = require("@/components/Services");
var HowItWorks_1 = require("@/components/HowItWorks");
var CustomerReviews_1 = require("@/components/CustomerReviews");
var CallToAction_1 = require("@/components/CallToAction");
var ContactForm_1 = require("@/components/ContactForm");
var Footer_1 = require("@/components/Footer");
var Index = function () {
    // Smooth scroll to sections when URL contains a hash
    (0, react_1.useEffect)(function () {
        if (window.location.hash) {
            var id = window.location.hash.substring(1);
            var element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, []);
    return (<div className="min-h-screen flex flex-col">
            <Header_1.default />
            <main>
                <Hero_1.default />
                <Services_1.default />
                <HowItWorks_1.default />
                <CustomerReviews_1.default />
                <CallToAction_1.default />
                <ContactForm_1.default />
            </main>
            <Footer_1.default />
        </div>);
};
exports.default = Index;
