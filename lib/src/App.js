"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var toaster_1 = require("@/components/ui/toaster");
var sonner_1 = require("@/components/ui/sonner");
var tooltip_1 = require("@/components/ui/tooltip");
var react_query_1 = require("@tanstack/react-query");
var react_router_dom_1 = require("react-router-dom");
var Index_1 = require("./pages/Index");
var NotFound_1 = require("./pages/NotFound");
var UploadPhotos_1 = require("./pages/UploadPhotos");
var GetQuote_1 = require("./pages/GetQuote");
var ScheduleService_1 = require("./pages/ScheduleService");
var PaymentPage_1 = require("./pages/PaymentPage");
var Confirmation_1 = require("./pages/Confirmation");
var AuthLayout_1 = require("./layouts/AuthLayout");
var Login_1 = require("./pages/Login");
var Register_1 = require("./pages/Register");
var Dashboard_1 = require("./pages/Dashboard");
var AuthContext_1 = require("./contexts/AuthContext");
var PrivateRoute_1 = require("@/components/PrivateRoute");
var AdminDashboard_1 = require("./admin/AdminDashboard");
// Create a new QueryClient instance
var queryClient = new react_query_1.QueryClient();
var App = function () {
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <tooltip_1.TooltipProvider>
        <react_router_dom_1.BrowserRouter>
          <AuthContext_1.AuthProvider>
            <react_router_dom_1.Routes>
              <react_router_dom_1.Route path="/" element={<Index_1.default />}/>
              <react_router_dom_1.Route path="/upload-photos" element={<UploadPhotos_1.default />}/>
              <react_router_dom_1.Route path="/get-quote" element={<GetQuote_1.default />}/>
              <react_router_dom_1.Route path="/schedule-service" element={<ScheduleService_1.default />}/>
              <react_router_dom_1.Route path="/payment" element={<PaymentPage_1.default />}/>
              <react_router_dom_1.Route path="/confirmation" element={<Confirmation_1.default />}/>
              <react_router_dom_1.Route path="/admin" element={<AdminDashboard_1.default />}/>
              <react_router_dom_1.Route element={<AuthLayout_1.default />}>
                <react_router_dom_1.Route path="/login" element={<Login_1.default />}/>
                <react_router_dom_1.Route path="/register" element={<Register_1.default />}/>
                <react_router_dom_1.Route path="/dashboard" element={<PrivateRoute_1.default><Dashboard_1.default /></PrivateRoute_1.default>}/>
              </react_router_dom_1.Route>
              <react_router_dom_1.Route path="*" element={<NotFound_1.default />}/>
            </react_router_dom_1.Routes>
            <toaster_1.Toaster />
            <sonner_1.Toaster />
          </AuthContext_1.AuthProvider>
        </react_router_dom_1.BrowserRouter>
      </tooltip_1.TooltipProvider>
    </react_query_1.QueryClientProvider>);
};
exports.default = App;
