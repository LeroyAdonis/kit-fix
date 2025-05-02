import { Sparkles, Truck, ShieldCheck } from 'lucide-react';

const services = [
  {
    title: "Vinyl Print Repair",
    description: "Professional restoration of damaged numbers, names, and logos",
    icon: <Sparkles className="w-8 h-8 text-electric-blue" />,
    iconBg: "bg-electric-blue-10"
  },
  {
    title: "Pickup & Delivery",
    description: "Convenient door-to-door service for your jersey repair",
    icon: <Truck className="w-8 h-8 text-fiery-red" />,
    iconBg: "bg-fiery-red-10"
  },
  {
    title: "Quality Guarantee",
    description: "100% satisfaction guaranteed on all repairs",
    icon: <ShieldCheck className="w-8 h-8 text-lime-green" />,
    iconBg: "bg-lime-green-10"
  }
];

const Services = () => {
  return (
    <section id="services" className="py-16 bg-pure-white">
      <div className="container-custom">
        <h2 className="heading-lg text-center mb-12">
          Our Services
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="p-6 rounded-lg bg-pure-white shadow-md hover:shadow-lg transition-all"
            >
              <div className={`${service.iconBg} p-4 rounded-full inline-flex mb-4`}>
                {service.icon}
              </div>
              <h3 className="heading-sm mb-3">{service.title}</h3>
              <p className="text-gray-700">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;