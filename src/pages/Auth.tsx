import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  phone: z.string().min(10, { message: 'Telefone deve ter pelo menos 10 dígitos' }).max(11, { message: 'Telefone deve ter no máximo 11 dígitos' }),
  email: z.string().trim().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// Format phone to Brazilian format (XX) XXXXX-XXXX or (XX) XXXX-XXXX
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function Auth() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurantContext();
  const { user, loading, signIn, signUp } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPhoneDigits, setSignupPhoneDigits] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(`/${slug}/account`);
    }
  }, [user, loading, navigate, slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error: authError } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de fazer login');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setSignupPhoneDigits(digits);
    setSignupPhone(formatPhone(value));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    const validation = signupSchema.safeParse({
      name: signupName,
      phone: signupPhoneDigits,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error: authError } = await signUp(signupEmail, signupPassword, {
      name: signupName,
      phone: signupPhoneDigits,
    }, slug);

    if (authError) {
      setIsSubmitting(false);
      if (authError.message.includes('User already registered')) {
        setError('Este e-mail já está cadastrado');
      } else if (authError.message.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      return;
    }

    setIsSubmitting(false);
    setSuccessMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
    setSignupName('');
    setSignupPhone('');
    setSignupPhoneDigits('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <Link 
          to={`/${slug}/menu`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Voltar ao cardápio</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center space-y-2">
            <img 
              src={restaurant?.logo_url || '/placeholder.svg'} 
              alt={restaurant?.name || 'Restaurante'} 
              className="h-16 mx-auto mb-2"
            />
            <CardTitle className="text-2xl font-bold text-foreground">
              {activeTab === 'login' ? 'Entrar' : 'Criar conta'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {activeTab === 'login' 
                ? 'Acesse sua conta para ver seus pedidos' 
                : 'Crie sua conta para uma experiência mais rápida'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'login' | 'signup');
              setError('');
              setSuccessMessage('');
            }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {successMessage && (
                <Alert className="mb-4 border-primary/50 bg-primary/10">
                  <AlertDescription className="text-primary">{successMessage}</AlertDescription>
                </Alert>
              )}

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="(XX) XXXXX-XXXX"
                        value={signupPhone}
                        onChange={handlePhoneChange}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="Confirme sua senha"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Continue without account */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Ou continue sem criar conta
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/${slug}/menu`)}
              >
                Continuar como visitante
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
