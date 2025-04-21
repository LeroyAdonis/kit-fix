"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var CallToAction = function () {
    return (<section id="cta" className="py-12 bg-electric-blue text-pure-white">
      <div className="container-custom text-center">
        <h2 className="heading-lg mb-4">
          Ready to Restore Your Jersey?
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Get started with your jersey repair today and enjoy our professional service
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <react_router_dom_1.Link to="/upload-photos" className="bg-pure-white text-electric-blue font-bold px-6 py-3 rounded-md hover:bg-gray-100 transition-colors">
            Start Free Quote
          </react_router_dom_1.Link>
          <a href="#contact" className="bg-transparent border-2 border-pure-white text-pure-white font-bold px-6 py-3 rounded-md hover:bg-white/10 transition-colors">
            Contact Us
          </a>
        </div>
      </div>
    </section>);
};
exports.default = CallToAction;
