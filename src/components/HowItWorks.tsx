import { Camera, MessageSquare, Calendar, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: <Camera className="w-6 h-6 text-pure-white" />,
    title: "Take Photos",
    description: "Upload photos of your damaged jersey",
    color: "bg-electric-blue"
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-pure-white" />,
    title: "Get Quote",
    description: "Receive instant pricing for your repair",
    color: "bg-fiery-red"
  },
  {
    icon: <Calendar className="w-6 h-6 text-pure-white" />,
    title: "Schedule Service",
    description: "Choose pickup date and location",
    color: "bg-lime-green"
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-pure-white" />,
    title: "Get Fixed",
    description: "Receive your restored jersey",
    color: "bg-electric-blue"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-16 bg-jet-black text-pure-white">
      <div className="container-custom">
        <h2 className="heading-lg text-center mb-12">
          How It Works
        </h2>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              <div className={`${step.color} p-4 rounded-full inline-flex items-center justify-center mb-4`}>
                {step.icon}
              </div>
              <h3 className="heading-sm mb-2">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;