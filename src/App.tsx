import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { RestaurantLayout } from "@/components/layout/RestaurantLayout";

// Critical path - keep eager
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const Account = lazy(() => import("./pages/Account"));
const Auth = lazy(() => import("./pages/Auth"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const RestaurantDetails = lazy(() => import("./pages/RestaurantDetails"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const PlatformAdminLogin = lazy(() => import("./pages/PlatformAdminLogin"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Landing / Home page */}
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Restaurant details/info page */}
              <Route path="/:slug/info" element={<RestaurantDetails />} />
              
              {/* Multi-tenant restaurant routes */}
              <Route path="/:slug/*" element={<RestaurantLayout />}>
                <Route index element={<Navigate to="menu" replace />} />
                <Route path="menu" element={<Menu />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order/:orderId" element={<OrderTracking />} />
                <Route path="account" element={<Account />} />
                <Route path="auth" element={<Auth />} />
                <Route path="kitchen" element={<Kitchen />} />
                <Route path="admin" element={<Admin />} />
                <Route path="admin/login" element={<AdminLogin />} />
                <Route path="admin/customers" element={<AdminCustomers />} />
                <Route path="privacidade" element={<PrivacyPolicy />} />
                <Route path="termos" element={<TermsOfUse />} />
              </Route>
              
              {/* Global pages */}
              <Route path="/platform-admin" element={<PlatformAdmin />} />
              <Route path="/platform-admin/login" element={<PlatformAdminLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos" element={<TermsOfUse />} />
              
              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
