import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivationChecklist } from '@/hooks/useActivationChecklist';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, Circle, Rocket, Share2, X, ChevronDown, ChevronUp
} from 'lucide-react';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export function ActivationChecklist({ onNavigateTab }: Props) {
  const { data: items, isLoading } = useActivationChecklist();
  const { restaurantId, slug } = useRestaurantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (dismissed || isLoading) return null;
  if (!items) return null;

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const allDone = completed === total;
  const progress = (completed / total) * 100;

  if (allDone) return null;

  const handleShare = async () => {
    const url = `${window.location.origin}/${slug}/menu?ref=${slug}&utm_source=share`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Veja nosso cardápio!', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado!' });
      }
      // Track share event
      if (restaurantId) {
        await supabase.from('onboarding_events').insert({
          restaurant_id: restaurantId,
          event_type: 'link_shared',
          metadata: { source: 'checklist' },
        });
        queryClient.invalidateQueries({ queryKey: ['activation-checklist'] });
      }
    } catch {
      // User cancelled share
    }
  };

  const handleAction = (item: (typeof items)[0]) => {
    if (item.key === 'share') {
      handleShare();
    } else if (item.actionTab && onNavigateTab) {
      onNavigateTab(item.actionTab);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Ativação do Restaurante
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completed}/{total}
          </span>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-2 space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 py-2"
            >
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              {!item.completed && item.key !== 'first_order' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8 text-xs"
                  onClick={() => handleAction(item)}
                >
                  {item.key === 'share' && <Share2 className="w-3 h-3 mr-1" />}
                  {item.actionLabel}
                </Button>
              )}
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center pt-2">
            🎯 Receba seu primeiro pedido em 24h!
          </p>
        </CardContent>
      )}
    </Card>
  );
}
