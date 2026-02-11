// Meta Pixel event tracking utilities

declare global {
  interface Window {
    fbq: (
      command: 'track' | 'trackCustom' | 'init',
      event: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

type FBEventParams = Record<string, unknown>;

export const trackFBEvent = (eventName: string, params?: FBEventParams) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

// E-commerce events
export const fbTrackViewContent = (item: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  trackFBEvent('ViewContent', {
    content_ids: [item.id],
    content_name: item.name,
    content_category: item.category,
    content_type: 'product',
    value: item.price,
    currency: 'BRL',
  });
};

export const fbTrackAddToCart = (item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) => {
  trackFBEvent('AddToCart', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: 'BRL',
  });
};

export const fbTrackInitiateCheckout = (
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  value: number
) => {
  trackFBEvent('InitiateCheckout', {
    content_ids: items.map(i => i.id),
    contents: items.map(i => ({ id: i.id, quantity: i.quantity })),
    num_items: items.length,
    value,
    currency: 'BRL',
  });
};

export const fbTrackPurchase = (
  transactionId: string,
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  value: number
) => {
  trackFBEvent('Purchase', {
    content_ids: items.map(i => i.id),
    contents: items.map(i => ({ id: i.id, quantity: i.quantity })),
    num_items: items.length,
    value,
    currency: 'BRL',
  });
};

// Address mode tracking
export const fbTrackAddressMode = (mode: 'map' | 'manual', step: 'selected' | 'completed') => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'AddressMode', {
      address_mode: mode,
      interaction_step: step,
    });
  }
};
