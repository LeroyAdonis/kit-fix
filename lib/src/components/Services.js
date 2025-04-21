"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var services = [
    {
        title: "Vinyl Print Repair",
        description: "Professional restoration of damaged numbers, names, and logos",
        icon: <lucide_react_1.Sparkles className="w-8 h-8 text-electric-blue"/>,
        iconBg: "bg-electric-blue-10"
    },
    {
        title: "Pickup & Delivery",
        description: "Convenient door-to-door service for your jersey repair",
        icon: <lucide_react_1.Truck className="w-8 h-8 text-fiery-red"/>,
        iconBg: "bg-fiery-red-10"
    },
    {
        title: "Quality Guarantee",
        description: "100% satisfaction guaranteed on all repairs",
        icon: <lucide_react_1.ShieldCheck className="w-8 h-8 text-lime-green"/>,
        iconBg: "bg-lime-green-10"
    }
];
var Services = function () {
    return (<section id="services" className="py-16 bg-pure-white">
      <div className="container-custom">
        <h2 className="heading-lg text-center mb-12">
          Our Services
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map(function (service, index) { return (<div key={index} className="p-6 rounded-lg bg-pure-white shadow-md hover:shadow-lg transition-all">
              <div className={"".concat(service.iconBg, " p-4 rounded-full inline-flex mb-4")}>
                {service.icon}
              </div>
              <h3 className="heading-sm mb-3">{service.title}</h3>
              <p className="text-gray-700">{service.description}</p>
            </div>); })}
        </div>
      </div>
    </section>);
};
exports.default = Services;
