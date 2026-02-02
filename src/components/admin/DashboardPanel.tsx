import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { TrendingUp, TrendingDown, Users, UserPlus, UserCheck, DollarSign, ShoppingBag, Receipt } from 'lucide-react';
import { formatPrice } from '@/lib/formatUtils';

function MetricCard({
  title,
  value,
  previousValue,
  icon: Icon,
  format = 'number',
  subtitle,
}: {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percent';
  subtitle?: string;
}) {
  const formattedValue = format === 'currency' 
    ? formatPrice(value) 
    : format === 'percent' 
      ? `${value.toFixed(1)}%`
      : value.toString();

  const hasComparison = previousValue !== undefined && previousValue > 0;
  const percentChange = hasComparison 
    ? ((value - previousValue) / previousValue) * 100 
    : 0;
  const isPositive = percentChange >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {hasComparison && (
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{percentChange.toFixed(1)}% vs período anterior</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerBreakdown({
  newCustomers,
  returningCustomers,
  newPrevious,
  returningPrevious,
}: {
  newCustomers: number;
  returningCustomers: number;
  newPrevious: number;
  returningPrevious: number;
}) {
  const total = newCustomers + returningCustomers;
  const newPercent = total > 0 ? (newCustomers / total) * 100 : 0;
  const returningPercent = total > 0 ? (returningCustomers / total) * 100 : 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes Este Mês: Novos vs Recorrentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* New Customers */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Novos Clientes</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{newCustomers}</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${newPercent}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{newPercent.toFixed(0)}% do total</span>
              {newPrevious > 0 && (
                <span className={newCustomers >= newPrevious ? 'text-green-600' : 'text-red-600'}>
                  {newCustomers >= newPrevious ? '↑' : '↓'} {Math.abs(newCustomers - newPrevious)} vs mês anterior
                </span>
              )}
            </div>
          </div>

          {/* Returning Customers */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Clientes Recorrentes</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{returningCustomers}</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${returningPercent}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{returningPercent.toFixed(0)}% do total</span>
              {returningPrevious > 0 && (
                <span className={returningCustomers >= returningPrevious ? 'text-green-600' : 'text-red-600'}>
                  {returningCustomers >= returningPrevious ? '↑' : '↓'} {Math.abs(returningCustomers - returningPrevious)} vs mês anterior
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {returningPercent > 50 
              ? '✅ Ótimo! Mais da metade dos clientes são recorrentes, indicando boa fidelização.'
              : returningPercent > 30
                ? '📊 Equilibrado. Foco em converter novos clientes em recorrentes com o programa de fidelidade.'
                : '⚠️ Muitos clientes novos. Considere estratégias de retenção para aumentar a recorrência.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardPanel() {
  const { data: metrics, isLoading, error } = useDashboardMetrics();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar métricas. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado disponível ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revenue & Orders KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Faturamento Hoje"
          value={metrics.revenue.today}
          previousValue={metrics.revenue.todayPrevious}
          icon={DollarSign}
          format="currency"
          subtitle={`${metrics.revenue.ordersToday} pedidos`}
        />
        <MetricCard
          title="Faturamento Semana"
          value={metrics.revenue.week}
          previousValue={metrics.revenue.weekPrevious}
          icon={Receipt}
          format="currency"
          subtitle={`${metrics.revenue.ordersWeek} pedidos`}
        />
        <MetricCard
          title="Faturamento Mês"
          value={metrics.revenue.month}
          previousValue={metrics.revenue.monthPrevious}
          icon={ShoppingBag}
          format="currency"
          subtitle={`${metrics.revenue.ordersMonth} pedidos`}
        />
        <MetricCard
          title="Ticket Médio"
          value={metrics.avgTicket.current}
          previousValue={metrics.avgTicket.previous}
          icon={TrendingUp}
          format="currency"
          subtitle="Este mês"
        />
      </div>

      {/* Customer Breakdown */}
      <CustomerBreakdown
        newCustomers={metrics.customers.newCustomers}
        returningCustomers={metrics.customers.returningCustomers}
        newPrevious={metrics.customers.newCustomersPrevious}
        returningPrevious={metrics.customers.returningCustomersPrevious}
      />

      {/* Total Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Base Total de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.customers.totalCustomers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Clientes cadastrados no sistema
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
