import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantBySlug } from '@/hooks/useRestaurant';
import { toast } from 'sonner';
import { CreditCard, Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export function PaymentSettingsForm() {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant } = useRestaurantBySlug(slug);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [useOwnGateway, setUseOwnGateway] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    fetchSettings();
  }, [restaurant?.id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_payment_settings' as any)
        .select('gateway_mode, public_key, encrypted_access_token, updated_at')
        .eq('restaurant_id', restaurant!.id)
        .maybeSingle();

      if (data && !error) {
        const settings = data as any;
        setUseOwnGateway(settings.gateway_mode === 'own_gateway');
        setPublicKey(settings.public_key || '');
        setHasExistingToken(!!settings.encrypted_access_token);
        setLastSaved(settings.updated_at);
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (useOwnGateway && !accessToken && !hasExistingToken) {
      toast.error('Informe o Access Token do Mercado Pago');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        gateway_mode: useOwnGateway ? 'own_gateway' : 'platform',
      };

      if (useOwnGateway) {
        if (accessToken) payload.access_token = accessToken;
        if (publicKey) payload.public_key = publicKey;
      }

      const { data, error } = await supabase.functions.invoke('save-payment-settings', {
        body: payload,
      });

      if (error) throw error;

      toast.success('Configurações de pagamento salvas!');
      setAccessToken('');
      setHasExistingToken(useOwnGateway);
      setLastSaved(new Date().toISOString());
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Gateway de Pagamento</CardTitle>
              <CardDescription>
                Configure como os pagamentos PIX são processados no seu restaurante
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="space-y-1">
              <Label className="text-base font-medium">Usar meu próprio Mercado Pago</Label>
              <p className="text-sm text-muted-foreground">
                {useOwnGateway
                  ? 'Os pagamentos vão direto para sua conta do Mercado Pago'
                  : 'Os pagamentos são processados pela conta da plataforma'}
              </p>
            </div>
            <Switch
              checked={useOwnGateway}
              onCheckedChange={setUseOwnGateway}
            />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {useOwnGateway && hasExistingToken ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Gateway próprio configurado
              </Badge>
            ) : useOwnGateway ? (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Pendente de configuração
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                Usando plataforma
              </Badge>
            )}
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Última atualização: {new Date(lastSaved).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Own Gateway Fields */}
          {useOwnGateway && (
            <div className="space-y-4 p-4 rounded-lg border border-border">
              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token *</Label>
                <Input
                  id="access_token"
                  type="password"
                  placeholder={hasExistingToken ? '••••••••••••• (já configurado)' : 'APP_USR-...'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {hasExistingToken
                    ? 'Deixe em branco para manter o token atual. Preencha para substituir.'
                    : 'Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais de produção'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="public_key">Public Key (opcional)</Label>
                <Input
                  id="public_key"
                  placeholder="APP_USR-..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Chave pública do Mercado Pago (opcional, para integrações futuras)
                </p>
              </div>

              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Seu Access Token é criptografado com AES antes de ser armazenado e nunca é exposto ao navegador.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
