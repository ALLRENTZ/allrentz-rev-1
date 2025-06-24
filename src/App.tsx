
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecurityProvider } from "./components/SecurityProvider";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import DemoNotificationBar from "./components/DemoNotificationBar";
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import Browse from "./pages/Browse";
import BrowseResults from "./pages/BrowseResults";
import CustomerDashboard from "./pages/CustomerDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import CustomerOnboarding from "./pages/CustomerOnboarding";
import VendorOnboarding from "./pages/VendorOnboarding";
import EnterpriseOnboarding from "./pages/EnterpriseOnboarding";
import SmartMatchDemo from "./pages/SmartMatchDemo";
import SecurityCenter from "./pages/SecurityCenter";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SecurityProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <DemoNotificationBar />
              <Navigation />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/browse/results" element={<BrowseResults />} />
                  <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                  <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                  <Route path="/customer-onboarding" element={<CustomerOnboarding />} />
                  <Route path="/vendor-onboarding" element={<VendorOnboarding />} />
                  <Route path="/enterprise-onboarding" element={<EnterpriseOnboarding />} />
                  <Route path="/smartmatch-demo" element={<SmartMatchDemo />} />
                  <Route path="/security-center" element={<SecurityCenter />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </SecurityProvider>
  </QueryClientProvider>
);

export default App;
