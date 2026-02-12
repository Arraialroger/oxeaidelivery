import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Chave pública VAPID para o cliente
const VAPID_PUBLIC_KEY = "BGKsh90VJgjOeyZsCuNXlR3_k1GdFUJGP_0_aj37VzAQBtW6zvQ73zf_Vrwa0-sOzcQRqyjAO6x0vTFH-O53_gA";

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  error: string | null;
}

// Converter VAPID key de base64 para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(orderId: string | undefined): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte do navegador
  useEffect(() => {
    const checkSupport = () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Verificar se já está inscrito para este pedido
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (!orderId || !isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();

        if (subscription) {
          // Verificar se já existe no banco para este pedido
          const { data } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("order_id", orderId)
            .eq("endpoint", subscription.endpoint)
            .maybeSingle();

          setIsSubscribed(!!data);
        }
      } catch (e) {
        console.error("[Push] Error checking subscription:", e);
      }
    };

    checkExistingSubscription();
  }, [orderId, isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!orderId || !isSupported) {
      setError("Push notifications não suportado");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Solicitar permissão
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setError("Permissão negada para notificações");
        setIsLoading(false);
        return false;
      }

      // Registrar service worker se necessário
      const registration = await navigator.serviceWorker.ready;

      // SEMPRE limpar subscription antiga primeiro (resolver erro de applicationServerKey)
      try {
        const existingSubscription = await (registration as any).pushManager.getSubscription();
        if (existingSubscription) {
          console.log("[Push] Removendo subscription antiga...");
          
          // Remover do banco de dados
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", existingSubscription.endpoint);
          
          // Cancelar subscription no browser
          await existingSubscription.unsubscribe();
          
          // Delay para garantir que o browser processou
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (cleanupError) {
        console.warn("[Push] Erro ao limpar subscription antiga:", cleanupError);
        // Continuar mesmo se falhar
      }

      // Criar nova subscription com as chaves atuais
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription: PushSubscription;
      
      try {
        subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      } catch (subscribeError: any) {
        // Se der erro de chave diferente, orientar o usuário
        if (subscribeError?.message?.includes('applicationServerKey')) {
          throw new Error(
            "Por favor, limpe os dados do site nas configurações do navegador e tente novamente"
          );
        }
        throw subscribeError;
      }

      const subscriptionJson = subscription.toJSON();

      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error("Subscription inválida");
      }

      // Salvar no Supabase
      const { error: dbError } = await supabase.from("push_subscriptions").insert({
        order_id: orderId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      });

      if (dbError) {
        console.error("[Push] Error saving subscription:", dbError);
        throw new Error("Erro ao salvar inscrição");
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("[Push] Subscribe error:", e);
      setError(e instanceof Error ? e.message : "Erro ao ativar notificações");
      setIsLoading(false);
      return false;
    }
  }, [orderId, isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    error,
  };
}
