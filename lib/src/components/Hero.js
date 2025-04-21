"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var hero_jpeg_1 = require("../assets/hero.jpeg");
var Hero = function () {
    return (<section id="home" className="bg-background pt-24 pb-16">
      <div className="container-custom">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side: Text content */}
          <div>
            <h1 className="heading-lg mb-4 text-jet-black">
              Restore Your Soccer <span className="text-electric-blue">Jersey</span> Magic
            </h1>

            <p className="text-lg text-gray-700 mb-6">
              Professional vinyl print repairs for your beloved soccer jerseys.
              Fast, reliable, and guaranteed results.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#services" className="btn-primary">
                View Our Services
                <lucide_react_1.ArrowRight className="ml-2 h-4 w-4"/>
              </a>
              <a href="#contact" className="inline-flex items-center justify-center rounded-md border-2 border-electric-blue px-6 py-3 text-electric-blue font-bold bg-transparent transition-all duration-300 hover:bg-electric-blue/5">
                Talk to Us
              </a>
            </div>
          </div>

          {/* Right side: Jersey Image */}
          <div className="flex justify-center">
            <div className="rounded-lg overflow-hidden hero-image">
              <img src={hero_jpeg_1.default} alt="Soccer jersey restoration" className="w-full h-auto object-cover"/>
            </div>
          </div>
        </div>
      </div>
    </section>);
};
exports.default = Hero;
