import React from 'react';
import ContactFormSection from './ContactFormSection';
import ContactInfo from './ContactInfo';
import BusinessHours from './BusinessHours';
import ResponseGuarantee from './ResponseGuarantee';

const ContactForm = () => {
  return (
    <section id="contact" className="section-padding bg-gradient-to-b from-pure-white to-gray-50">
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
          <ContactFormSection />

          {/* Contact Info */}
          <div className="space-y-8 lg:pl-8">
            <ContactInfo />
            <BusinessHours />
            <ResponseGuarantee />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;