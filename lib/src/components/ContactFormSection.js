"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var zod_1 = require("@hookform/resolvers/zod");
var react_hook_form_1 = require("react-hook-form");
var zod_2 = require("zod");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var form_1 = require("@/components/ui/form");
var input_1 = require("@/components/ui/input");
var textarea_1 = require("@/components/ui/textarea");
var select_1 = require("@/components/ui/select");
var use_toast_1 = require("@/hooks/use-toast");
var formSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: zod_2.z.string().email({ message: "Please enter a valid email address." }),
    phone: zod_2.z.string().optional(),
    service: zod_2.z.string().optional(),
    message: zod_2.z.string().min(10, { message: "Message must be at least 10 characters." }),
});
var ContactFormSection = function () {
    var toast = (0, use_toast_1.useToast)().toast;
    var form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            service: "",
            message: "",
        },
    });
    function onSubmit(data) {
        // In a real application, you would send this data to your backend
        console.log('Form submitted:', data);
        toast({
            title: "Message sent!",
            description: "Thank you for your message. We will get back to you soon.",
        });
        form.reset();
    }
    return (<div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="heading-sm mb-6 text-left">Send Us a Message</h3>

            <form_1.Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <form_1.FormField control={form.control} name="name" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                    <form_1.FormLabel>Full Name</form_1.FormLabel>
                                    <form_1.FormControl>
                                        <input_1.Input placeholder="John Doe" {...field}/>
                                    </form_1.FormControl>
                                    <form_1.FormMessage />
                                </form_1.FormItem>);
        }}/>

                        <form_1.FormField control={form.control} name="email" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                    <form_1.FormLabel>Email Address</form_1.FormLabel>
                                    <form_1.FormControl>
                                        <input_1.Input placeholder="you@example.com" {...field}/>
                                    </form_1.FormControl>
                                    <form_1.FormMessage />
                                </form_1.FormItem>);
        }}/>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <form_1.FormField control={form.control} name="phone" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                    <form_1.FormLabel>Phone Number</form_1.FormLabel>
                                    <form_1.FormControl>
                                        <input_1.Input placeholder="(123) 456-7890" {...field}/>
                                    </form_1.FormControl>
                                    <form_1.FormMessage />
                                </form_1.FormItem>);
        }}/>

                        <form_1.FormField control={form.control} name="service" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                    <form_1.FormLabel>Service Needed</form_1.FormLabel>
                                    <select_1.Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <form_1.FormControl>
                                            <select_1.SelectTrigger>
                                                <select_1.SelectValue placeholder="Select a service"/>
                                            </select_1.SelectTrigger>
                                        </form_1.FormControl>
                                        <select_1.SelectContent>
                                            <select_1.SelectItem value="name-number">Name & Number Restoration</select_1.SelectItem>
                                            <select_1.SelectItem value="badge-patch">Badge & Patch Repair</select_1.SelectItem>
                                            <select_1.SelectItem value="express">Express Service</select_1.SelectItem>
                                            <select_1.SelectItem value="full">Full Jersey Restoration</select_1.SelectItem>
                                            <select_1.SelectItem value="custom">Custom Services</select_1.SelectItem>
                                        </select_1.SelectContent>
                                    </select_1.Select>
                                    <form_1.FormMessage />
                                </form_1.FormItem>);
        }}/>
                    </div>

                    <form_1.FormField control={form.control} name="message" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                                <form_1.FormLabel>Your Message</form_1.FormLabel>
                                <form_1.FormControl>
                                    <textarea_1.Textarea placeholder="Tell us about your jersey and what needs to be fixed..." className="min-h-[120px]" {...field}/>
                                </form_1.FormControl>
                                <form_1.FormMessage />
                            </form_1.FormItem>);
        }}/>

                    <button_1.Button type="submit" className="w-full">
                        <lucide_react_1.Send className="mr-2 h-4 w-4"/>
                        Send Message
                    </button_1.Button>
                </form>
            </form_1.Form>
        </div>);
};
exports.default = ContactFormSection;
