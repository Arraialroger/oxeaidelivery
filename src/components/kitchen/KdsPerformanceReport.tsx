import { useEffect, useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { CalendarIcon, Clock, TrendingUp, XCircle, Package, Loader2, AlertCircle } from 'lucide-react';

import { useKdsMetrics } from '@/hooks/useKdsMetrics';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const STATUS_COLORS: Record<string, string> = {
  delivered: 'hsl(142, 76%, 36%)',
  cancelled: 'hsl(0, 84%, 60%)',
  active: 'hsl(217, 91%, 60%)'
};

export function KdsPerformanceReport() {
  const { restaurantId } = useRestaurantContext();
  const { metrics, loading, error, fetchMetrics } = useKdsMetrics();
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));

  useEffect(() => {
    fetchMetrics(restaurantId, {
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    });
  }, [startDate, endDate, fetchMetrics, restaurantId]);

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null) return '-';
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Período:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && setStartDate(date)}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground">até</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && setEndDate(date)}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(startOfDay(new Date())); setEndDate(endOfDay(new Date())); }}>
            Hoje
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(subDays(new Date(), 7)); setEndDate(new Date()); }}>
            7 dias
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(subDays(new Date(), 30)); setEndDate(new Date()); }}>
            30 dias
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {(!metrics || metrics.totalOrders === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum dado disponível</p>
            <p className="text-sm">Os eventos serão exibidos conforme os pedidos forem processados.</p>
          </CardContent>
        </Card>
      )}

      {metrics && metrics.totalOrders > 0 && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total de Pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.totalOrders}</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.deliveredOrders} entregues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Médio p/ Início
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMinutes(metrics.avgPrepTime)}</p>
                <p className="text-sm text-muted-foreground">
                  recebido → preparando
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tempo Médio Total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMinutes(metrics.avgTimeToDelivery)}</p>
                <p className="text-sm text-muted-foreground">
                  recebido → entregue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Taxa de Cancelamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-3xl font-bold",
                  metrics.cancellationRate > 10 ? "text-destructive" : ""
                )}>
                  {metrics.cancellationRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.cancelledOrders} cancelados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volume by Hour */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volume por Horário</CardTitle>
                <CardDescription>Pedidos recebidos por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.volumeByHour}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        formatter={(value: number) => [`${value} pedidos`, 'Quantidade']}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Status</CardTitle>
                <CardDescription>Status final dos pedidos no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="label"
                        label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {metrics.statusDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                        formatter={(value: number, name: string) => [`${value} pedidos`, name]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
