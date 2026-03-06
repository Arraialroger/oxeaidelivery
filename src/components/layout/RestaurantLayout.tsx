import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { RestaurantProvider, useRestaurantContext } from '@/contexts/RestaurantContext';
import RestaurantNotFound from '@/pages/RestaurantNotFound';
import { Loader2 } from 'lucide-react';
import { useRestaurantHead } from '@/hooks/useRestaurantHead';

function useTrackingScripts(settings: { fb_pixel_id?: string; gtag_id?: string } | null) {
  useEffect(() => {
    if (!settings) return;
    const scripts: HTMLScriptElement[] = [];

    // Facebook Pixel
    if (settings.fb_pixel_id) {
      const fbScript = document.createElement('script');
      fbScript.innerHTML = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${settings.fb_pixel_id}');fbq('track','PageView');
      `;
      document.head.appendChild(fbScript);
      scripts.push(fbScript);
    }

    // Google Analytics / GTM
    if (settings.gtag_id) {
      const id = settings.gtag_id;
      if (id.startsWith('GTM-')) {
        const gtmScript = document.createElement('script');
        gtmScript.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${id}');
        `;
        document.head.appendChild(gtmScript);
        scripts.push(gtmScript);
      } else {
        const gaLoader = document.createElement('script');
        gaLoader.async = true;
        gaLoader.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(gaLoader);
        scripts.push(gaLoader);

        const gaInit = document.createElement('script');
        gaInit.innerHTML = `
          window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());gtag('config','${id}');
        `;
        document.head.appendChild(gaInit);
        scripts.push(gaInit);
      }
    }

    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [settings?.fb_pixel_id, settings?.gtag_id]);
}

function RestaurantLayoutContent() {
  const { isLoading, notFound, slug, restaurant, settings } = useRestaurantContext();
  useRestaurantHead(restaurant);
  useTrackingScripts(settings);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return <RestaurantNotFound slug={slug} />;
  }

  return <Outlet />;
}

export function RestaurantLayout() {
  return (
    <RestaurantProvider>
      <RestaurantLayoutContent />
    </RestaurantProvider>
  );
}
