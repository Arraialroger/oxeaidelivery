import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { TrendingUp, TrendingDown, Users, UserPlus, UserCheck, DollarSign, ShoppingBag, FileDown } from 'lucide-react';
import { formatPrice } from '@/lib/formatUtils';
import { OrdersChart } from './OrdersChart';
import { AddressModeChart } from './AddressModeChart';
import { InactiveCustomersPanel } from './InactiveCustomersPanel';
import { DashboardDateFilter, getDefaultDateRange, type DateRange } from './DashboardDateFilter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
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
          Clientes no Período: Novos vs Recorrentes
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
                  {newCustomers >= newPrevious ? '↑' : '↓'} {Math.abs(newCustomers - newPrevious)} vs anterior
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
                  {returningCustomers >= returningPrevious ? '↑' : '↓'} {Math.abs(returningCustomers - returningPrevious)} vs anterior
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
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
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardPanel() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { data: metrics, isLoading, error } = useDashboardMetrics(dateRange);

  const handleExportPDF = () => {
    if (!metrics) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Dashboard de Vendas', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodText = `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
    doc.text(periodText, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Revenue Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faturamento', 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Faturamento no Período: ${formatPrice(metrics.revenue.current)}`, 25, y);
    y += 6;
    doc.text(`Total de Pedidos: ${metrics.revenue.ordersCurrent}`, 25, y);
    y += 6;
    doc.text(`Ticket Médio: ${formatPrice(metrics.avgTicket.current)}`, 25, y);
    y += 12;

    // Comparison with previous period
    if (metrics.revenue.previous > 0) {
      const revenueChange = ((metrics.revenue.current - metrics.revenue.previous) / metrics.revenue.previous) * 100;
      const ticketChange = ((metrics.avgTicket.current - metrics.avgTicket.previous) / metrics.avgTicket.previous) * 100;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Comparação com Período Anterior', 20, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Variação Faturamento: ${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`, 25, y);
      y += 6;
      doc.text(`Variação Ticket Médio: ${ticketChange >= 0 ? '+' : ''}${ticketChange.toFixed(1)}%`, 25, y);
      y += 12;
    }

    // Customers Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clientes', 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const totalPeriod = metrics.customers.newCustomers + metrics.customers.returningCustomers;
    const newPercent = totalPeriod > 0 ? (metrics.customers.newCustomers / totalPeriod) * 100 : 0;
    const returningPercent = totalPeriod > 0 ? (metrics.customers.returningCustomers / totalPeriod) * 100 : 0;

    doc.text(`Novos Clientes: ${metrics.customers.newCustomers} (${newPercent.toFixed(0)}%)`, 25, y);
    y += 6;
    doc.text(`Clientes Recorrentes: ${metrics.customers.returningCustomers} (${returningPercent.toFixed(0)}%)`, 25, y);
    y += 6;
    doc.text(`Base Total de Clientes: ${metrics.customers.totalCustomers}`, 25, y);
    y += 15;

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 280, { align: 'center' });

    // Save
    const fileName = `dashboard-vendas-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar métricas. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Filter + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DashboardDateFilter value={dateRange} onChange={setDateRange} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isLoading || !metrics}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !metrics ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum dado disponível ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Revenue & Orders KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Faturamento no Período"
              value={metrics.revenue.current}
              previousValue={metrics.revenue.previous}
              icon={DollarSign}
              format="currency"
              subtitle={`${metrics.revenue.ordersCurrent} pedidos`}
            />
            <MetricCard
              title="Ticket Médio"
              value={metrics.avgTicket.current}
              previousValue={metrics.avgTicket.previous}
              icon={TrendingUp}
              format="currency"
            />
            <MetricCard
              title="Total de Pedidos"
              value={metrics.revenue.ordersCurrent}
              previousValue={metrics.revenue.ordersPrevious}
              icon={ShoppingBag}
              format="number"
            />
          </div>

          {/* Orders Chart */}
          <OrdersChart dateRange={dateRange} />

          {/* Customer Breakdown */}
          <CustomerBreakdown
            newCustomers={metrics.customers.newCustomers}
            returningCustomers={metrics.customers.returningCustomers}
            newPrevious={metrics.customers.newCustomersPrevious}
            returningPrevious={metrics.customers.returningCustomersPrevious}
          />

          {/* Address Mode Chart */}
          <AddressModeChart dateRange={dateRange} />

          {/* Inactive Customers */}
          <InactiveCustomersPanel />

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
        </>
      )}
    </div>
  );
}
