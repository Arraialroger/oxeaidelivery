import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomers } from '@/hooks/useCustomers';
import { UserX, Download, MessageCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPrice } from '@/lib/formatUtils';
import { toast } from 'sonner';

type InactivityFilter = 15 | 30 | 60;

export function InactiveCustomersPanel() {
  const [filter, setFilter] = useState<InactivityFilter>(30);
  const { data: customers, isLoading } = useCustomers('all');

  const inactiveCustomers = useMemo(() => {
    if (!customers) return [];
    const now = new Date();
    return customers
      .filter((c) => {
        if (!c.last_order_date) return c.order_count > 0; // had orders but no date (edge)
        const days = differenceInDays(now, new Date(c.last_order_date));
        return days >= filter && c.order_count > 0;
      })
      .sort((a, b) => {
        const dA = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
        const dB = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
        return dA - dB; // oldest first
      });
  }, [customers, filter]);

  const handleExportWhatsApp = () => {
    if (inactiveCustomers.length === 0) {
      toast.error('Nenhum cliente inativo para exportar.');
      return;
    }

    const header = 'Nome;Telefone;Último Pedido;Total Gasto;Qtd Pedidos';
    const rows = inactiveCustomers.map((c) => {
      const lastOrder = c.last_order_date
        ? new Date(c.last_order_date).toLocaleDateString('pt-BR')
        : 'N/A';
      return `${c.name || 'Sem nome'};${c.phone};${lastOrder};${formatPrice(c.total_spent)};${c.order_count}`;
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes-inativos-${filter}dias.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${inactiveCustomers.length} clientes exportados!`);
  };

  const filterOptions: { value: InactivityFilter; label: string }[] = [
    { value: 15, label: '15 dias' },
    { value: 30, label: '30 dias' },
    { value: 60, label: '60 dias' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Clientes Inativos
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportWhatsApp}
              disabled={inactiveCustomers.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {inactiveCustomers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente inativo há mais de {filter} dias. Ótimo sinal! 🎉</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 p-3 bg-destructive/10 rounded-lg flex items-center justify-between">
              <p className="text-sm text-destructive font-medium">
                ⚠️ {inactiveCustomers.length} cliente{inactiveCustomers.length > 1 ? 's' : ''} sem pedido há mais de {filter} dias
              </p>
              <Badge variant="destructive" className="text-xs">
                Reativar
              </Badge>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {inactiveCustomers.map((customer) => {
                const daysInactive = customer.last_order_date
                  ? differenceInDays(new Date(), new Date(customer.last_order_date))
                  : null;

                return (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {customer.name || 'Sem nome'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{customer.phone}</span>
                        <span>•</span>
                        <span>{customer.order_count} pedidos</span>
                        <span>•</span>
                        <span>{formatPrice(customer.total_spent)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <Clock className="h-3 w-3" />
                          {daysInactive !== null
                            ? `${daysInactive}d inativo`
                            : 'Sem data'}
                        </div>
                        {customer.last_order_date && (
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(customer.last_order_date), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </div>
                      <a
                        href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
