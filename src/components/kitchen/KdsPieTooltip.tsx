import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface KdsPieTooltipProps extends TooltipProps<ValueType, NameType> {
  valueFormatter?: (value: number) => string;
  labelKey?: string;
}

export const KdsPieTooltip = ({ 
  active, 
  payload, 
  valueFormatter,
  labelKey = 'Valor'
}: KdsPieTooltipProps) => {
  // Don't render anything if not active or no payload
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];
  const name = data.name as string;
  const value = data.value as number;

  const formattedValue = valueFormatter 
    ? valueFormatter(value) 
    : value.toString();

  return (
    <div 
      className="rounded-lg border bg-card px-3 py-2 shadow-md"
      style={{
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        color: 'hsl(var(--card-foreground))',
      }}
    >
      <p className="font-medium" style={{ color: 'hsl(var(--card-foreground))' }}>
        {name}
      </p>
      <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {labelKey}: <span className="font-semibold" style={{ color: 'hsl(var(--card-foreground))' }}>{formattedValue}</span>
      </p>
    </div>
  );
};
