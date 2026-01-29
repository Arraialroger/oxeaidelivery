import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { RestaurantLayout } from "@/components/layout/RestaurantLayout";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import Kitchen from "./pages/Kitchen";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminCustomers from "./pages/AdminCustomers";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Index from "./pages/Index";
import RestaurantDetails from "./pages/RestaurantDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing / Home page */}
            <Route path="/" element={<Index />} />
            
            {/* Restaurant details/info page (outside RestaurantLayout for lighter context) */}
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
            </Route>
            
            {/* Global pages (no restaurant context needed) */}
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfUse />} />
            
            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
