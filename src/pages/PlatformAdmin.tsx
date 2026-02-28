import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlatformMonitorPanel } from '@/components/platform/PlatformMonitorPanel';
import { PlatformHealthPanel } from '@/components/platform/PlatformHealthPanel';
import { PlatformRestaurantsPanel } from '@/components/platform/PlatformRestaurantsPanel';
import { Activity, HeartPulse, LogOut, Shield, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate('/platform-admin/login');
    }
  }, [user, isSuperAdmin, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Super Admin — Plataforma</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 lg:px-8">
        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="restaurants" className="gap-2">
              <Store className="w-4 h-4" />
              Restaurantes
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2">
              <Activity className="w-4 h-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="w-4 h-4" />
              Saúde
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gestão de Restaurantes</h2>
            </div>
            <PlatformRestaurantsPanel />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monitor de Pagamentos — Todos os Restaurantes</h2>
            </div>
            <PlatformMonitorPanel />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Saúde da Plataforma — Consolidado</h2>
            </div>
            <PlatformHealthPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
