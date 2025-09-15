
import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CsvAuthProvider } from "@/contexts/CsvAuthContext";
import { RepositoryProvider } from "@/contexts/RepositoryContext";
import { SecurityProvider, MFAProvider, SAMLProvider, initializeSecurity } from "@/security";
import Navigation from "./components/navigation/Navigation";
import Footer from "./components/navigation/Footer";
import LoadingSkeleton from "./components/layout/LoadingSkeleton";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import SkipNavigation from "./components/navigation/SkipNavigation";

// Lazy load all route components for optimal bundle splitting
const Index = lazy(() => import("./pages/public/Index"));
const Browse = lazy(() => import("./pages/public/Browse"));
const BrowseResults = lazy(() => import("./pages/public/BrowseResults"));
const Landing = lazy(() => import("./pages/public/Landing"));
const HowItWorks = lazy(() => import("./pages/public/HowItWorks"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const CustomerDashboard = lazy(() => import("./pages/dashboard/CustomerDashboard"));
const VendorDashboard = lazy(() => import("./pages/dashboard/VendorDashboard"));
const CustomerOnboarding = lazy(() => import("./pages/onboarding/CustomerOnboarding"));
const VendorOnboarding = lazy(() => import("./pages/onboarding/VendorOnboarding"));
const EnterpriseOnboarding = lazy(() => import("./pages/onboarding/EnterpriseOnboarding"));
const SmartMatchDemo = lazy(() => import("./pages/public/SmartMatchDemo"));
const SmartDraft = lazy(() => import("./pages/public/SmartDraft"));
const OperationsCenter = lazy(() => import("./pages/dashboard/OperationsCenter"));
const SecurityCenter = lazy(() => import("./pages/dashboard/SecurityCenter"));
const DeliveryTracking = lazy(() => import("./pages/management/DeliveryTracking"));
const DocumentsManagement = lazy(() => import("./pages/management/DocumentsManagement"));
const TurnaroundManagement = lazy(() => import("./pages/management/TurnaroundManagement"));
const NotFound = lazy(() => import("./pages/public/NotFound"));

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
  // Initialize security module on app startup
  useEffect(() => {
    initializeSecurity();
  }, []);

  return (
    <ErrorBoundary level="page" name="App Root">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary level="page" name="Security Provider">
            <SecurityProvider>
              <MFAProvider>
                <SAMLProvider>
                  <ErrorBoundary level="page" name="Repository Provider">
                    <RepositoryProvider>
                      <ErrorBoundary level="page" name="Auth Provider">
                        <AuthProvider>
                          <CsvAuthProvider>
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
                          </CsvAuthProvider>
                        </AuthProvider>
                      </ErrorBoundary>
                    </RepositoryProvider>
                  </ErrorBoundary>
                </SAMLProvider>
              </MFAProvider>
            </SecurityProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
