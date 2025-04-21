"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var steps = [
    {
        icon: <lucide_react_1.Camera className="w-6 h-6 text-pure-white"/>,
        title: "Take Photos",
        description: "Upload photos of your damaged jersey",
        color: "bg-electric-blue"
    },
    {
        icon: <lucide_react_1.MessageSquare className="w-6 h-6 text-pure-white"/>,
        title: "Get Quote",
        description: "Receive instant pricing for your repair",
        color: "bg-fiery-red"
    },
    {
        icon: <lucide_react_1.Calendar className="w-6 h-6 text-pure-white"/>,
        title: "Schedule Service",
        description: "Choose pickup date and location",
        color: "bg-lime-green"
    },
    {
        icon: <lucide_react_1.CheckCircle className="w-6 h-6 text-pure-white"/>,
        title: "Get Fixed",
        description: "Receive your restored jersey",
        color: "bg-electric-blue"
    }
];
var HowItWorks = function () {
    return (<section id="how-it-works" className="py-16 bg-jet-black text-pure-white">
      <div className="container-custom">
        <h2 className="heading-lg text-center mb-12">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map(function (step, index) { return (<div key={index} className="flex flex-col items-center text-center">
              <div className={"".concat(step.color, " p-4 rounded-full inline-flex items-center justify-center mb-4")}>
                {step.icon}
              </div>
              <h3 className="heading-sm mb-2">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </div>); })}
        </div>
      </div>
    </section>);
};
exports.default = HowItWorks;
