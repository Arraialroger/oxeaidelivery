import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeaturedCard } from "./FeaturedCard";
import type { Product } from "@/types";

interface FeaturedSectionProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function FeaturedSection({ products, onProductClick }: FeaturedSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get first 4 products as featured items (you can customize this logic later)
  const featuredProducts = products.slice(0, 10);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 220;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-4 overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 px-4">🔥 Os Mais Pedidos</h2>

        {/* Navigation Arrows - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 px-4">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {featuredProducts.map((product, index) => (
          <div
            key={product.id}
            className="snap-start flex-shrink-0 animate-fade-in opacity-0"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "forwards",
            }}
          >
            <FeaturedCard product={product} onClick={() => onProductClick(product)} />
          </div>
        ))}
      </div>
    </section>
  );
}
