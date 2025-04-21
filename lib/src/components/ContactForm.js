"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var ContactFormSection_1 = require("./ContactFormSection");
var ContactInfo_1 = require("./ContactInfo");
var BusinessHours_1 = require("./BusinessHours");
var ResponseGuarantee_1 = require("./ResponseGuarantee");
var ContactForm = function () {
    return (<section id="contact" className="section-padding bg-gradient-to-b from-pure-white to-gray-50">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="heading-lg mb-4 animate-fade-in-up">
            Contact <span className="text-lime-green">KitFix</span>
          </h2>
          <p className="text-lg text-gray-700 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Have questions or ready to restore your jersey? Get in touch with our team today.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <ContactFormSection_1.default />

          {/* Contact Info */}
          <div className="space-y-8 lg:pl-8">
            <ContactInfo_1.default />
            <BusinessHours_1.default />
            <ResponseGuarantee_1.default />
          </div>
        </div>
      </div>
    </section>);
};
exports.default = ContactForm;
