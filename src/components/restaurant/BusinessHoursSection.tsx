import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { BusinessHour } from '@/hooks/useBusinessHours';

interface BusinessHoursSectionProps {
  hours: BusinessHour[];
}

const dayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time.slice(0, 5); // Returns HH:MM
}

export function BusinessHoursSection({ hours }: BusinessHoursSectionProps) {
  const today = new Date().getDay();

  // Create a complete week with all days
  const fullWeek = Array.from({ length: 7 }, (_, i) => {
    const dayHours = hours.find((h) => h.day_of_week === i);
    return {
      day: i,
      open_time: dayHours?.open_time ?? null,
      close_time: dayHours?.close_time ?? null,
      is_closed: dayHours?.is_closed ?? true,
    };
  });

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Horário de funcionamento
        </h3>
        <div className="space-y-2">
          {fullWeek.map((item) => (
            <div
              key={item.day}
              className={`flex items-center justify-between py-1.5 px-2 rounded-md ${
                item.day === today ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span className="text-sm">{dayNames[item.day]}</span>
              <span className={`text-sm ${item.is_closed ? 'text-muted-foreground' : ''}`}>
                {item.is_closed
                  ? 'Fechado'
                  : `${formatTime(item.open_time)} - ${formatTime(item.close_time)}`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
