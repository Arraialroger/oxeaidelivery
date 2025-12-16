import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
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
  const { data: products = [], isLoading } = useProducts(activeCategory);
  const { data: allProducts = [] } = useProducts(null);
  
  const { shouldShowSecondVisitPrompt, promptInstall, dismissInstall } = usePWAInstall();

  // Show modal on 2nd visit
  useEffect(() => {
    if (shouldShowSecondVisitPrompt) {
      const timer = setTimeout(() => setShowPWAModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowSecondVisitPrompt]);

  const handlePWAModalClose = () => {
    setShowPWAModal(false);
    dismissInstall();
  };

  return (
    <div className="min-h-screen bg-background">
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

      {/* PWA Install Button - Fixed */}
      <div className="px-4 py-2">
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
      />
    </div>
  );
}
