
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalErrorBoundary } from "@/components/layout/GlobalErrorBoundary";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import BrowseResults from "./pages/BrowseResults";
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import AuthPage from "./pages/AuthPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import CustomerOnboarding from "./pages/CustomerOnboarding";
import VendorOnboarding from "./pages/VendorOnboarding";
import EnterpriseOnboarding from "./pages/EnterpriseOnboarding";
import SmartMatchDemo from "./pages/SmartMatchDemo";
import SmartDraft from "./pages/SmartDraft";
import OperationsCenter from "./pages/OperationsCenter";
import SecurityCenter from "./pages/SecurityCenter";
import DeliveryTracking from "./pages/management/DeliveryTracking";
import DocumentsManagement from "./pages/management/DocumentsManagement";
import TurnaroundManagement from "./pages/management/TurnaroundManagement";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/browse" element={<Browse />} />
                    <Route path="/browse/results" element={<BrowseResults />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                    <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                    <Route path="/customer-onboarding" element={<CustomerOnboarding />} />
                    <Route path="/vendor-onboarding" element={<VendorOnboarding />} />
                    <Route path="/enterprise-onboarding" element={<EnterpriseOnboarding />} />
                    <Route path="/smartmatch-demo" element={<SmartMatchDemo />} />
                    <Route path="/smart-draft" element={<SmartDraft />} />
                    <Route path="/operations-center" element={<OperationsCenter />} />
                    <Route path="/security-center" element={<SecurityCenter />} />
                    <Route path="/delivery-tracking" element={<DeliveryTracking />} />
                    <Route path="/documents-management" element={<DocumentsManagement />} />
                    <Route path="/turnaround-management" element={<TurnaroundManagement />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
