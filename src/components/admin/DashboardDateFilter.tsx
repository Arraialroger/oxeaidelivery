import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface DashboardDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const handlePresetSelect = (days: number, label: string) => {
    const now = new Date();
    onChange({
      from: startOfDay(subDays(now, days - 1)),
      to: endOfDay(now),
      label,
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({
        from: startOfDay(date),
        to: value.to,
        label: `${format(date, 'dd/MM', { locale: ptBR })} - ${format(value.to, 'dd/MM', { locale: ptBR })}`,
      });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({
        from: value.from,
        to: endOfDay(date),
        label: `${format(value.from, 'dd/MM', { locale: ptBR })} - ${format(date, 'dd/MM', { locale: ptBR })}`,
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">Período:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value.from, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value.from}
            onSelect={handleStartDateChange}
            locale={ptBR}
            disabled={(date) => date > new Date()}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">até</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value.to, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value.to}
            onSelect={handleEndDateChange}
            locale={ptBR}
            disabled={(date) => date > new Date() || date < value.from}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="sm" onClick={() => handlePresetSelect(1, 'Hoje')}>
          Hoje
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handlePresetSelect(7, '7 dias')}>
          7 dias
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handlePresetSelect(30, '30 dias')}>
          30 dias
        </Button>
      </div>
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: startOfDay(subDays(now, 29)),
    to: endOfDay(now),
    label: '30 dias',
  };
}
