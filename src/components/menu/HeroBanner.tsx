import { useConfig } from '@/hooks/useConfig';

export function HeroBanner() {
  const { data: config, isLoading } = useConfig();

  // Don't show anything if loading, no config, or no banner URL
  if (isLoading || !config?.hero_banner_url) {
    return null;
  }

  return (
    <div className="w-full">
      <img
        src={config.hero_banner_url}
        alt="Banner promocional Astral Gastro Bar"
        className="w-full h-auto object-cover rounded-b-2xl"
      />
    </div>
  );
}