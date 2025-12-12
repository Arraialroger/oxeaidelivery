import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { ProductList } from '@/components/menu/ProductList';
import { ProductModal } from '@/components/menu/ProductModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FeaturedSection } from '@/components/menu/FeaturedSection';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types';

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProducts(activeCategory);
  
  // Get all products for featured section (without category filter)
  const { data: allProducts = [] } = useProducts(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

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
    </div>
  );
}
