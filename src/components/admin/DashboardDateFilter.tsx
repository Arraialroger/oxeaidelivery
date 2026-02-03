import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const presetRanges = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
];

interface DashboardDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const handlePresetSelect = (days: number, label: string) => {
    const now = new Date();
    onChange({
      from: startOfDay(subDays(now, days - 1)),
      to: endOfDay(now),
      label,
    });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({
        from: startOfDay(customFrom),
        to: endOfDay(customTo),
        label: `${format(customFrom, 'dd/MM', { locale: ptBR })} - ${format(customTo, 'dd/MM', { locale: ptBR })}`,
      });
      setIsCustomOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {value.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {presetRanges.map((preset) => (
            <DropdownMenuItem
              key={preset.days}
              onClick={() => handlePresetSelect(preset.days, preset.label)}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setIsCustomOpen(true)}>
            Período customizado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            <div className="text-sm font-medium">Selecione o período</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">De</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={setCustomFrom}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Até</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={setCustomTo}
                      disabled={(date) => date > new Date() || (customFrom && date < customFrom)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full" 
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: startOfDay(subDays(now, 29)),
    to: endOfDay(now),
    label: 'Últimos 30 dias',
  };
}
