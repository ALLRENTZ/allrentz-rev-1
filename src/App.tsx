
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import LoadingSkeleton from "./components/LoadingSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import SkipNavigation from "./components/SkipNavigation";

// Lazy load all route components for optimal bundle splitting
const Index = lazy(() => import("./pages/Index"));
const Browse = lazy(() => import("./pages/Browse"));
const BrowseResults = lazy(() => import("./pages/BrowseResults"));
const Landing = lazy(() => import("./pages/Landing"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const CustomerOnboarding = lazy(() => import("./pages/CustomerOnboarding"));
const VendorOnboarding = lazy(() => import("./pages/VendorOnboarding"));
const EnterpriseOnboarding = lazy(() => import("./pages/EnterpriseOnboarding"));
const SmartMatchDemo = lazy(() => import("./pages/SmartMatchDemo"));
const SmartDraft = lazy(() => import("./pages/SmartDraft"));
const OperationsCenter = lazy(() => import("./pages/OperationsCenter"));
const SecurityCenter = lazy(() => import("./pages/SecurityCenter"));
const DeliveryTracking = lazy(() => import("./pages/DeliveryTracking"));
const DocumentsManagement = lazy(() => import("./pages/DocumentsManagement"));
const TurnaroundManagement = lazy(() => import("./pages/TurnaroundManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Enterprise-grade React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache time - how long data stays in cache when unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data
      refetchOnWindowFocus: false, // Disabled for industrial app usage
      // Refetch on reconnect
      refetchOnReconnect: 'always',
      // Background refetch interval for real-time data
      refetchInterval: false, // Disable by default, enable per query as needed
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      // Mutation retry delay
      retryDelay: 1000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary level="page" name="App Root">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary level="page" name="Auth Provider">
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <SkipNavigation />
                <div className="flex flex-col min-h-screen">
                  <ErrorBoundary level="section" name="Navigation">
                    <Navigation />
                  </ErrorBoundary>
                  <main id="main-content" className="flex-1">
                    <ErrorBoundary level="page" name="Route Content">
                      <Suspense fallback={<LoadingSkeleton variant="page" />}>
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
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                  <ErrorBoundary level="section" name="Footer">
                    <Footer />
                  </ErrorBoundary>
                </div>
              </BrowserRouter>
            </AuthProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
