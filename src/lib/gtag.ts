// Google Analytics 4 event tracking utilities

declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      action: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

type GtagEventParams = Record<string, unknown>;

export const trackEvent = (eventName: string, params?: GtagEventParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// E-commerce events
export const trackViewItem = (item: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  trackEvent('view_item', {
    currency: 'BRL',
    value: item.price,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: 1,
      },
    ],
  });
};

export const trackAddToCart = (item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) => {
  trackEvent('add_to_cart', {
    currency: 'BRL',
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  });
};

export const trackBeginCheckout = (items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, value: number) => {
  trackEvent('begin_checkout', {
    currency: 'BRL',
    value,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

export const trackPurchase = (
  transactionId: string,
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  value: number,
  shipping: number
) => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'BRL',
    value,
    shipping,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

// Address mode tracking
export const trackAddressMode = (mode: 'map' | 'manual', step: 'selected' | 'completed') => {
  trackEvent('address_mode', {
    address_mode: mode,
    interaction_step: step,
  });
};
