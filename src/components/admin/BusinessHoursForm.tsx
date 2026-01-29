import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useUpsertBusinessHours } from '@/hooks/useBusinessHoursMutations';
import { Loader2, Clock } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

interface DayHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const defaultHours: DayHours[] = DAYS_OF_WEEK.map(day => ({
  day_of_week: day.value,
  open_time: '18:00',
  close_time: '23:00',
  is_closed: day.value === 0, // Domingo fechado por padrão
}));

export function BusinessHoursForm() {
  const { restaurantId, restaurant } = useRestaurantContext();
  const { data: existingHours, isLoading } = useBusinessHours(restaurantId);
  const upsertMutation = useUpsertBusinessHours(restaurantId);
  
  const [hours, setHours] = useState<DayHours[]>(defaultHours);

  // Load existing hours
  useEffect(() => {
    if (existingHours && existingHours.length > 0) {
      const mergedHours = DAYS_OF_WEEK.map(day => {
        const existing = existingHours.find(h => h.day_of_week === day.value);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            open_time: existing.open_time || '18:00',
            close_time: existing.close_time || '23:00',
            is_closed: existing.is_closed ?? false,
          };
        }
        return {
          day_of_week: day.value,
          open_time: '18:00',
          close_time: '23:00',
          is_closed: day.value === 0,
        };
      });
      setHours(mergedHours);
    }
  }, [existingHours]);

  const updateDay = (dayIndex: number, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, [field]: value } : h
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertMutation.mutateAsync(hours);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <CardTitle>Horários de Funcionamento</CardTitle>
        </div>
        <CardDescription>
          Configure os horários de abertura e fechamento de {restaurant?.name || 'seu restaurante'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayHours = hours[index];
              return (
                <div 
                  key={day.value} 
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    dayHours.is_closed ? 'bg-muted/50' : 'bg-background'
                  }`}
                >
                  <div className="w-28 flex-shrink-0">
                    <Label className="font-medium">{day.label}</Label>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={!dayHours.is_closed}
                      onCheckedChange={(checked) => updateDay(index, 'is_closed', !checked)}
                    />
                    <span className="text-sm text-muted-foreground w-16">
                      {dayHours.is_closed ? 'Fechado' : 'Aberto'}
                    </span>
                  </div>

                  {!dayHours.is_closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={dayHours.open_time}
                        onChange={(e) => updateDay(index, 'open_time', e.target.value)}
                        className="w-[120px]"
                      />
                      <span className="text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={dayHours.close_time}
                        onChange={(e) => updateDay(index, 'close_time', e.target.value)}
                        className="w-[120px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Horários
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
