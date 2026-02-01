import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Clock, Phone, MessageCircle, Instagram, Facebook,
  CreditCard, Banknote, QrCode, ChevronLeft, ExternalLink,
  Store, Loader2, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRestaurantDetails } from '@/hooks/useRestaurantDetails';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { useRestaurantOpenStatus } from '@/hooks/useRestaurantOpenStatus';
import { formatWhatsAppLink } from '@/lib/phoneUtils';
import { GallerySection } from '@/components/restaurant/GallerySection';
import { BusinessHoursSection } from '@/components/restaurant/BusinessHoursSection';
import { FeaturedProductsSection } from '@/components/restaurant/FeaturedProductsSection';

const paymentIcons: Record<string, { icon: React.ElementType; label: string }> = {
  pix: { icon: QrCode, label: 'PIX' },
  dinheiro: { icon: Banknote, label: 'Dinheiro' },
  credito: { icon: CreditCard, label: 'Crédito' },
  debito: { icon: CreditCard, label: 'Débito' },
};

export default function RestaurantDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant, isLoading, isError } = useRestaurantDetails(slug);
  const { data: businessHours } = useBusinessHours(restaurant?.id);
  const { data: featuredProducts } = useFeaturedProducts(restaurant?.id, 4);
  
  // All hooks must be called before any conditional returns
  const { isOpen, nextOpenTime, nextCloseTime, closingSoon, closingVerySoon } = useRestaurantOpenStatus(restaurant?.id, restaurant?.settings ?? null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !restaurant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Store className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Restaurante não encontrado</h1>
        <p className="text-muted-foreground mb-4">O restaurante que você procura não existe.</p>
        <Link to="/">
          <Button variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  const whatsappLink = formatWhatsAppLink(restaurant.whatsapp);
  const acceptedPayments = restaurant.accepted_payments || ['pix', 'dinheiro', 'credito', 'debito'];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
        {restaurant.hero_banner_url ? (
          <img
            src={restaurant.hero_banner_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Back button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* Logo */}
        {restaurant.logo_url && (
          <div className="absolute -bottom-10 left-4 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-card border-4 border-background shadow-xl overflow-hidden">
            <img
              src={restaurant.logo_url}
              alt={`Logo ${restaurant.name}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pt-14 pb-24">
        {/* Header Info */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={isOpen ? 'default' : 'secondary'} 
                className={isOpen ? (closingSoon ? `bg-amber-500 ${closingVerySoon ? 'animate-pulse' : ''}` : 'bg-green-500') : ''}
              >
                {isOpen 
                  ? (nextCloseTime?.includes('min') ? nextCloseTime : 'Aberto agora')
                  : (nextOpenTime || 'Fechado')
                }
              </Badge>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">4.8</span>
                <span className="text-xs text-muted-foreground">(127 avaliações)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {restaurant.description && (
          <p className="text-muted-foreground mb-6">{restaurant.description}</p>
        )}

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-card/50">
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">{restaurant.avg_delivery_time || 40} min</p>
              <p className="text-xs text-muted-foreground">Tempo médio</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3 text-center">
              <Banknote className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">R$ {(restaurant.settings?.delivery_fee || 5).toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-muted-foreground">Taxa de entrega</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3 text-center">
              <Store className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">R$ {(restaurant.min_order || 0).toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-muted-foreground">Pedido mínimo</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-medium">4.8</p>
              <p className="text-xs text-muted-foreground">Avaliação</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact & Social */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Contato</h3>
            <div className="space-y-3">
              {restaurant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm">{restaurant.address}</span>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-primary hover:underline">
                    {restaurant.phone}
                  </a>
                </div>
              )}
              {whatsappLink && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    WhatsApp
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              
              {(restaurant.instagram || restaurant.facebook) && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-4">
                    {restaurant.instagram && (
                      <a 
                        href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Instagram className="w-5 h-5" />
                        {restaurant.instagram}
                      </a>
                    )}
                    {restaurant.facebook && (
                      <a 
                        href={`https://facebook.com/${restaurant.facebook}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Facebook className="w-5 h-5" />
                        Facebook
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        {businessHours && businessHours.length > 0 && (
          <BusinessHoursSection hours={businessHours} />
        )}

        {/* Gallery */}
        {restaurant.gallery_urls && restaurant.gallery_urls.length > 0 && (
          <GallerySection images={restaurant.gallery_urls} restaurantName={restaurant.name} />
        )}

        {/* Accepted Payments */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Formas de pagamento</h3>
            <div className="flex flex-wrap gap-3">
              {acceptedPayments.map((payment) => {
                const paymentInfo = paymentIcons[payment];
                if (!paymentInfo) return null;
                const Icon = paymentInfo.icon;
                return (
                  <div key={payment} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm">{paymentInfo.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Featured Products */}
        {featuredProducts && featuredProducts.length > 0 && (
          <FeaturedProductsSection products={featuredProducts} slug={slug!} />
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-4xl mx-auto">
          <Link to={`/${slug}/menu`}>
            <Button className="w-full" size="lg">
              Ver Cardápio Completo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
