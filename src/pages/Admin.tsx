import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductList } from '@/components/admin/ProductList';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CategoryList } from '@/components/admin/CategoryList';
import { ConfigForm } from '@/components/admin/ConfigForm';
import { StampTransactionsList } from '@/components/admin/StampTransactionsList';
import { RestaurantProfileForm } from '@/components/admin/RestaurantProfileForm';
import { BusinessHoursForm } from '@/components/admin/BusinessHoursForm';
import { DashboardPanel } from '@/components/admin/DashboardPanel';
import { DeliveryZonesManager } from '@/components/admin/DeliveryZonesManager';
import { CouponList } from '@/components/admin/CouponList';
import { CouponForm } from '@/components/admin/CouponForm';
import { Plus, Package, Layers, Settings, LogOut, Users, ChefHat, UtensilsCrossed, Gift, Store, Clock, LayoutDashboard, MapPin, Tag, ShoppingBag, CreditCard, Shield } from 'lucide-react';
import { UpsellManager } from '@/components/admin/UpsellManager';
import { PaymentSettingsForm } from '@/components/admin/PaymentSettingsForm';
import { useAuth } from '@/hooks/useAuth';

export default function Admin() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin, isSuperAdmin, loading, signOut } = useAuth();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate(`/${slug}/admin/login`);
    }
  }, [user, isAdmin, loading, navigate, slug]);

  const handleSignOut = async () => {
    await signOut();
    navigate(`/${slug}/admin/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href={`/${slug}/menu`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Cardápio</span>
                </Button>
              </a>
              <a href={`/${slug}/kitchen`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <ChefHat className="w-4 h-4" />
                  <span>KDS</span>
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <a href="/platform-admin">
                  <Button variant="outline" size="sm" className="gap-2 border-primary text-primary">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Plataforma</span>
                  </Button>
                </a>
              )}
              <a href={`/${slug}/admin/customers`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">CRM</span>
                </Button>
              </a>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 lg:px-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Categorias</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Entrega</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Cupons</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Fidelidade</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Horários</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="upsell" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Upsell</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Dashboard de Vendas</h2>
            </div>
            <DashboardPanel />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Produtos</h2>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Produto</DialogTitle>
                  </DialogHeader>
                  <ProductForm onSuccess={() => setProductDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
            <ProductList />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Categorias</h2>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Categoria</DialogTitle>
                  </DialogHeader>
                  <CategoryForm onSuccess={() => setCategoryDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
            <CategoryList />
          </TabsContent>

          {/* Delivery Zones Tab */}
          <TabsContent value="delivery">
            <DeliveryZonesManager />
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cupons de Desconto</h2>
              <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Cupom</DialogTitle>
                  </DialogHeader>
                  <CouponForm onSuccess={() => setCouponDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
            <CouponList />
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Programa de Fidelidade</h2>
            </div>
            <StampTransactionsList />
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours">
            <BusinessHoursForm />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <RestaurantProfileForm />
          </TabsContent>

          {/* Upsell Tab */}
          <TabsContent value="upsell">
            <UpsellManager />
          </TabsContent>




          {/* Payment Settings Tab */}
          <TabsContent value="payments">
            <PaymentSettingsForm />
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <ConfigForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
