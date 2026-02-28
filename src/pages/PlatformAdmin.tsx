import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlatformMonitorPanel } from '@/components/platform/PlatformMonitorPanel';
import { PlatformHealthPanel } from '@/components/platform/PlatformHealthPanel';
import { PlatformRestaurantsPanel } from '@/components/platform/PlatformRestaurantsPanel';
import { Activity, AlertCircle, HeartPulse, Lock, LogOut, Mail, Shield, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Endereço de e-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

function PlatformLoginForm() {
  const { signIn, user, isSuperAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? 'E-mail ou senha inválidos'
            : signInError.message
        );
      } else {
        setTimeout(() => {
          setError('Acesso negado. Apenas super administradores podem acessar esta área.');
          setIsSubmitting(false);
        }, 2000);
        return;
      }
    } catch {
      setError('Ocorreu um erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Super Admin</CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesse o painel de administração da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@plataforma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background border-border"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/platform-admin');
  };

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
            <h2 className="text-lg font-semibold">Gestão de Restaurantes</h2>
            <PlatformRestaurantsPanel />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <h2 className="text-lg font-semibold">Monitor de Pagamentos — Todos os Restaurantes</h2>
            <PlatformMonitorPanel />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <h2 className="text-lg font-semibold">Saúde da Plataforma — Consolidado</h2>
            <PlatformHealthPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function PlatformAdmin() {
  const { user, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && isSuperAdmin) {
    return <PlatformDashboard />;
  }

  return <PlatformLoginForm />;
}