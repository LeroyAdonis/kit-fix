import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UploadPhotos from "./pages/UploadPhotos";
import GetQuote from "./pages/GetQuote";
import ScheduleService from "./pages/ScheduleService";
import PaymentPage from "./pages/PaymentPage";
import Confirmation from "./pages/Confirmation";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import AdminDashboard from "./admin/AdminDashboard";

// Create a new QueryClient instance
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/upload-photos" element={<UploadPhotos />} />
              <Route path="/get-quote" element={<GetQuote />} />
              <Route path="/schedule-service" element={<ScheduleService />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/confirmation/:orderId" element={<Confirmation />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/admin/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;