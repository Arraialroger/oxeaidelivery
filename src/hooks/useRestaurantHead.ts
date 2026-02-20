import { useEffect } from 'react';
import type { Restaurant } from '@/types/restaurant';

const DEFAULT_TITLE = 'Delivery';
const DEFAULT_DESCRIPTION = 'Peça pelo app com entrega rápida';
const DEFAULT_FAVICON = '/logo-astral.png';
const DEFAULT_THEME_COLOR = '#000000';

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

function setLinkHref(selector: string, href: string) {
  const el = document.querySelector<HTMLLinkElement>(selector);
  if (el) el.href = href;
}

export function useRestaurantHead(restaurant: Restaurant | null) {
  // Title & Favicon & Theme color & Meta OG
  useEffect(() => {
    if (!restaurant) return;

    const title = `${restaurant.name} | Delivery`;
    const description = (restaurant as any).description || DEFAULT_DESCRIPTION;
    const favicon = restaurant.logo_url || DEFAULT_FAVICON;
    const themeColor = restaurant.primary_color || DEFAULT_THEME_COLOR;
    const ogImage = restaurant.hero_banner_url || restaurant.logo_url || DEFAULT_FAVICON;

    document.title = title;

    // Favicon
    setLinkHref('link[rel="icon"]', favicon);
    setLinkHref('link[rel="apple-touch-icon"]', favicon);

    // Theme color
    setMetaContent('meta[name="theme-color"]', themeColor);
    setMetaContent('meta[name="apple-mobile-web-app-title"]', restaurant.name);

    // OG tags
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:image"]', ogImage);
    setMetaContent('meta[name="description"]', description);

    // Twitter
    setMetaContent('meta[name="twitter:image"]', ogImage);

    return () => {
      document.title = DEFAULT_TITLE;
      setLinkHref('link[rel="icon"]', DEFAULT_FAVICON);
      setLinkHref('link[rel="apple-touch-icon"]', DEFAULT_FAVICON);
      setMetaContent('meta[name="theme-color"]', DEFAULT_THEME_COLOR);
      setMetaContent('meta[name="apple-mobile-web-app-title"]', DEFAULT_TITLE);
      setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:image"]', DEFAULT_FAVICON);
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[name="twitter:image"]', DEFAULT_FAVICON);
    };
  }, [restaurant]);

  // Dynamic PWA manifest via Blob URL
  useEffect(() => {
    if (!restaurant) return;

    const manifest = {
      name: restaurant.name,
      short_name: restaurant.name.substring(0, 12),
      description: (restaurant as any).description || 'Faça seu pedido',
      theme_color: restaurant.primary_color || DEFAULT_THEME_COLOR,
      background_color: restaurant.primary_color || DEFAULT_THEME_COLOR,
      display: 'standalone',
      orientation: 'portrait',
      start_url: `/${restaurant.slug}/menu`,
      scope: `/${restaurant.slug}/`,
      icons: [
        {
          src: restaurant.logo_url || '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: restaurant.logo_url || '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: restaurant.logo_url || '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousHref = link?.href;
    if (link) link.href = url;

    return () => {
      URL.revokeObjectURL(url);
      if (link && previousHref) link.href = previousHref;
    };
  }, [restaurant]);
}
