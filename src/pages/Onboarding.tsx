import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnboarding } from '@/hooks/useOnboarding';

const appDomain = import.meta.env.VITE_APP_DOMAIN || window.location.hostname;
import { supabase } from '@/integrations/supabase/client';
import {
  Store, ArrowLeft, ArrowRight, Check, Loader2, Palette,
  ImagePlus, Utensils, Rocket, CheckCircle, XCircle, AlertCircle,
  Mail, Lock, User, Phone
} from 'lucide-react';

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Passo {current + 1} de {total}</span>
        <span>{Math.round(((current + 1) / total) * 100)}%</span>
      </div>
      <Progress value={((current + 1) / total) * 100} className="h-2" />
    </div>
  );
}

function Step1NameSlug({
  data, updateData, generateSlug, checkSlug, slugAvailable, checkingSlug
}: {
  data: ReturnType<typeof useOnboarding>['data'];
  updateData: ReturnType<typeof useOnboarding>['updateData'];
  generateSlug: (name: string) => string;
  checkSlug: (slug: string) => void;
  slugAvailable: boolean | null;
  checkingSlug: boolean;
}) {
  const handleNameChange = (name: string) => {
    updateData({ name });
    const slug = generateSlug(name);
    updateData({ slug });
    checkSlug(slug);
  };

  const handleSlugChange = (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    updateData({ slug: clean });
    checkSlug(clean);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Como se chama seu restaurante?</h2>
        <p className="text-sm text-muted-foreground">Este nome aparecerá para seus clientes</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nome do Restaurante</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Pizzaria do João"
            maxLength={100}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="slug">Link do seu cardápio</Label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{appDomain}/</span>
            <Input
              id="slug"
              value={data.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="meu-restaurante"
              maxLength={50}
            />
          </div>
          {data.slug.length >= 3 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              {checkingSlug ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Verificando...</span>
                </>
              ) : slugAvailable === true ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Disponível!</span>
                </>
              ) : slugAvailable === false ? (
                <>
                  <XCircle className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">Já está em uso</span>
                </>
              ) : null}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            value={data.category}
            onChange={(e) => updateData({ category: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="restaurant">Restaurante</option>
            <option value="pizzaria">Pizzaria</option>
            <option value="hamburgueria">Hamburgueria</option>
            <option value="lanchonete">Lanchonete</option>
            <option value="acai">Açaí</option>
            <option value="japonesa">Japonesa</option>
            <option value="doceria">Doceria</option>
            <option value="bebidas">Bebidas</option>
            <option value="marmita">Marmita</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function Step2LogoColors({
  data, updateData, uploadLogo
}: {
  data: ReturnType<typeof useOnboarding>['data'];
  updateData: ReturnType<typeof useOnboarding>['updateData'];
  uploadLogo: (file: File) => Promise<string | null>;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadLogo(file);
    if (url) updateData({ logoUrl: url });
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Palette className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Identidade visual</h2>
        <p className="text-sm text-muted-foreground">Logo e cores do seu restaurante (opcional)</p>
      </div>

      <div className="space-y-4">
        {/* Logo upload */}
        <div>
          <Label>Logo</Label>
          <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="w-8 h-8" />
                <span className="text-sm">Clique para enviar</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary">Cor principal</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                id="primary"
                value={data.primaryColor}
                onChange={(e) => updateData({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-input cursor-pointer"
              />
              <Input
                value={data.primaryColor}
                onChange={(e) => updateData({ primaryColor: e.target.value })}
                maxLength={7}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="secondary">Cor secundária</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                id="secondary"
                value={data.secondaryColor}
                onChange={(e) => updateData({ secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-input cursor-pointer"
              />
              <Input
                value={data.secondaryColor}
                onChange={(e) => updateData({ secondaryColor: e.target.value })}
                maxLength={7}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: data.primaryColor }}
              >
                <Utensils className="w-6 h-6" style={{ color: data.secondaryColor }} />
              </div>
            )}
            <div>
              <p className="font-bold" style={{ color: data.primaryColor }}>
                {data.name || 'Meu Restaurante'}
              </p>
              <p className="text-xs text-muted-foreground">{appDomain}/{data.slug || 'meu-restaurante'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Menu() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Utensils className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Cardápio inicial</h2>
        <p className="text-sm text-muted-foreground">
          Vamos criar um cardápio inicial com exemplos para você editar depois
        </p>
      </div>

      <div className="space-y-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">3 categorias criadas</p>
                <p className="text-xs text-muted-foreground">Pratos Principais, Bebidas, Sobremesas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">3 produtos de exemplo</p>
                <p className="text-xs text-muted-foreground">Editáveis no painel admin depois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Trial Pro de 14 dias</p>
                <p className="text-xs text-muted-foreground">Acesso completo a todas as funcionalidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-muted/50 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Você poderá adicionar, editar e remover produtos a qualquer momento pelo painel administrativo.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step4Summary({ data }: { data: ReturnType<typeof useOnboarding>['data'] }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Tudo pronto!</h2>
        <p className="text-sm text-muted-foreground">Confira os dados e abra seu restaurante</p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: data.primaryColor }}
              >
                <Utensils className="w-7 h-7" style={{ color: data.secondaryColor }} />
              </div>
            )}
            <div>
              <p className="font-bold text-lg">{data.name}</p>
              <p className="text-sm text-muted-foreground">{appDomain}/{data.slug}</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Categoria</span>
              <span className="capitalize">{data.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium text-primary">Pro (14 dias grátis)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cardápio</span>
              <span>3 produtos de exemplo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function OnboardingAuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (authError) {
      setError(authError.message.includes('Invalid login') ? 'E-mail ou senha incorretos' : 'Erro ao fazer login');
    } else {
      onAuthenticated();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.length < 2) { setError('Nome deve ter pelo menos 2 caracteres'); return; }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    setIsSubmitting(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone: phone.replace(/\D/g, '') } },
    });
    setIsSubmitting(false);
    if (authError) {
      setError(authError.message.includes('already registered') ? 'E-mail já cadastrado. Tente fazer login.' : 'Erro ao criar conta');
      return;
    }
    if (data?.user?.identities?.length === 0) {
      setError('E-mail já cadastrado mas não confirmado.');
      return;
    }
    if (data?.session) {
      onAuthenticated();
    } else {
      setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-6 space-y-4">
          <div className="text-center space-y-2">
            <Store className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Crie sua conta</h2>
            <p className="text-sm text-muted-foreground">Para criar seu restaurante</p>
          </div>

          {error && (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          )}
          {success && (
            <Alert className="border-primary/50 bg-primary/10"><AlertDescription className="text-primary">{success}</AlertDescription></Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'signup'); setError(''); setSuccess(''); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
              <TabsTrigger value="login">Entrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="(XX) XXXXX-XXXX" value={formatPhoneDisplay(phone)} onChange={(e) => setPhone(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" disabled={isSubmitting} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const onboarding = useOnboarding();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
  }, []);

  // Debounced slug check
  const debouncedCheck = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (slug: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => onboarding.checkSlugAvailability(slug), 500);
      };
    })(),
    []
  );

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <OnboardingAuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  const canProceed = () => {
    switch (onboarding.step) {
      case 0:
        return onboarding.data.name.length >= 3 && onboarding.data.slug.length >= 3 && onboarding.slugAvailable === true;
      case 1:
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => onboarding.step > 0 ? onboarding.prevStep() : navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1">Criar Restaurante</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <StepIndicator current={onboarding.step} total={onboarding.totalSteps} />

        {/* Step content */}
        {onboarding.step === 0 && (
          <Step1NameSlug
            data={onboarding.data}
            updateData={onboarding.updateData}
            generateSlug={onboarding.generateSlug}
            checkSlug={debouncedCheck}
            slugAvailable={onboarding.slugAvailable}
            checkingSlug={onboarding.checkingSlug}
          />
        )}
        {onboarding.step === 1 && (
          <Step2LogoColors
            data={onboarding.data}
            updateData={onboarding.updateData}
            uploadLogo={onboarding.uploadLogo}
          />
        )}
        {onboarding.step === 2 && <Step3Menu />}
        {onboarding.step === 3 && <Step4Summary data={onboarding.data} />}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4">
          {onboarding.step > 0 && (
            <Button variant="outline" onClick={onboarding.prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          {onboarding.step < onboarding.totalSteps - 1 ? (
            <Button onClick={onboarding.nextStep} disabled={!canProceed()} className="flex-1">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onboarding.submit}
              disabled={onboarding.isSubmitting}
              className="flex-1"
            >
              {onboarding.isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Abrir meu Restaurante!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
