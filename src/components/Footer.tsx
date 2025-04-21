import React from 'react';
import { Facebook, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-jet-black text-pure-white py-12">
      <div className="container-custom">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Column 1 - About */}
          <div>
            <div className="mb-4">
              <span className="text-2xl font-bold text-electric-blue">🔷 KitFix</span>
            </div>
            <p className="text-gray-400 mb-4">
              Professional soccer jersey restoration services
            </p>
            <div className="flex space-x-4 social-media-icons">
              <a href="#" className="text-gray-400 hover:text-electric-blue">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-blue">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-blue">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Column 2 - Services */}
          <div>
            <h4 className="text-lg font-bold mb-4">Services</h4>
            <ul className="space-y-2">
              {[
                'Vinyl Print Repair',
                'Number Restoration',
                'Badge Reapplication',
                'Pickup & Delivery',
                'Rush Service'
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#services"
                    className="text-gray-400 hover:text-electric-blue transition-colors duration-300"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h4 className="text-lg font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                'About Us',
                'How It Works',
                'Testimonials',
                'Blog',
                'FAQ'
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-electric-blue transition-colors duration-300"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <span className="block">Email:</span>
                <a href="mailto:info@kitfix.com" className="hover:text-electric-blue">info@kitfix.com</a>
              </li>
              <li>
                <span className="block">Phone:</span>
                <a href="tel:+1-800-KIT-FIXX" className="hover:text-electric-blue">1-800-KIT-FIXX</a>
              </li>
              <li>
                <span className="block">Address:</span>
                <address className="not-italic">123 Sports Blvd, Jersey City, NJ 07302</address>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-gray-500 text-sm">
          © {new Date().getFullYear()} KitFix. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;