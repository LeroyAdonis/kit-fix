
const BusinessHours = () => {
    return (
        <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h3 className="heading-sm mb-4 text-left">Business Hours</h3>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-700">Monday - Friday:</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-700">Saturday:</span>
                    <span className="font-medium">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-700">Sunday:</span>
                    <span className="font-medium">Closed</span>
                </div>
            </div>
        </div>
    );
};

export default BusinessHours;