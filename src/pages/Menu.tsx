import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { ProductList } from '@/components/menu/ProductList';
import { ProductModal } from '@/components/menu/ProductModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FeaturedSection } from '@/components/menu/FeaturedSection';
import { HeroBanner } from '@/components/menu/HeroBanner';
import { PWAInstallBanner, PWAInstallModal, PWAInstallButton } from '@/components/pwa';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import type { Product } from '@/types';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);

  const { data: categories = [] } = useCategories();
  // Single query - filter in memory to avoid duplicate requests
  const { data: allProducts = [], isLoading } = useProducts(null);
  const products = activeCategory 
    ? allProducts.filter(p => p.category_id === activeCategory)
    : allProducts;
  
  const { shouldShowSecondVisitPrompt, shouldShowIOSPrompt, promptInstall, dismissInstall, isIOSSafari } = usePWAInstall();

  // Show modal on 2nd visit (Android/Chrome or iOS/Safari)
  useEffect(() => {
    if (shouldShowSecondVisitPrompt || shouldShowIOSPrompt) {
      const timer = setTimeout(() => setShowPWAModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowSecondVisitPrompt, shouldShowIOSPrompt]);

  const handlePWAModalClose = () => {
    setShowPWAModal(false);
    dismissInstall();
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* PWA Install Banner */}
      <PWAInstallBanner />
      
      <Header />
      
      {/* Hero Banner - Dynamic from Admin */}
      <HeroBanner />
      
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* PWA Install Button - Only shows when installable */}
      <div className="px-4 my-2">
        <PWAInstallButton className="w-full" />
      </div>

      {/* Featured Section - Only show when no category is selected */}
      {!activeCategory && (
        <FeaturedSection
          products={allProducts}
          onProductClick={setSelectedProduct}
        />
      )}

      <ProductList
        products={products}
        isLoading={isLoading}
        onProductClick={setSelectedProduct}
      />

      <Footer />

      <BottomNav onCartClick={() => setIsCartOpen(true)} />

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* PWA Install Modal - 2nd visit */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={handlePWAModalClose}
        onInstall={promptInstall}
        variant="second-visit"
        isIOSSafari={isIOSSafari}
      />
    </div>
  );
}
