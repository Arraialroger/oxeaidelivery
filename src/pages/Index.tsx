import { useState, useMemo } from "react";
import { Loader2, Store, Utensils } from "lucide-react";
import { useRestaurants } from "@/hooks/useRestaurants";
import { RestaurantCard } from "@/components/marketplace/RestaurantCard";
import { CategoryFilter } from "@/components/marketplace/CategoryFilter";
import { SearchBar, LocationHeader } from "@/components/marketplace/SearchBar";

export default function Index() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: restaurants, isLoading, isError } = useRestaurants(activeCategory);

  // Filter restaurants by search query
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (!searchQuery.trim()) return restaurants;

    const query = searchQuery.toLowerCase();
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query),
    );
  }, [restaurants, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Arraial Delivery</h1>
                <p className="text-xs text-muted-foreground">Peça e receba em casa</p>
              </div>
            </div>
            <LocationHeader />
          </div>

          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar restaurantes, pratos..." />
        </div>
      </header>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Categorias</h2>
        <CategoryFilter activeCategory={activeCategory} onSelect={setActiveCategory} />
      </section>

      {/* Restaurants Grid */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {activeCategory === "all" ? "Todos os restaurantes" : "Resultados"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? "local" : "locais"}
          </span>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar restaurantes</h3>
            <p className="text-muted-foreground">Por favor, tente novamente mais tarde.</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum restaurante encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Tente buscar por outro termo." : "Não há restaurantes disponíveis nesta categoria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 Arraial Delivery. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
