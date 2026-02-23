import { usePaymentMonitor } from '@/hooks/usePaymentMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, Clock, Shield, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function truncateId(id: string) {
  return id.slice(0, 8);
}

const severityColors: Record<string, string> = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
};

export function PaymentMonitorPanel() {
  const {
    lastRun,
    loadingRun,
    activeAlertsCount,
    alerts,
    loadingAlerts,
    inconsistentPayments,
    loadingInconsistent,
    severityFilter,
    setSeverityFilter,
    resolveAlert,
    forceReconcile,
  } = usePaymentMonitor();

  const timeSinceLastRun = lastRun?.executed_at
    ? formatDistanceToNow(new Date(lastRun.executed_at), { locale: ptBR, addSuffix: true })
    : null;

  const cronOk = lastRun?.status === 'success';
  const hasInconsistencies = inconsistentPayments.length > 0;

  return (
    <div className="space-y-6">
      {/* Banner de inconsistência */}
      {hasInconsistencies && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pagamentos Inconsistentes Detectados</AlertTitle>
          <AlertDescription>
            {inconsistentPayments.length} pagamento(s) aprovado(s) com pedido ainda pendente.
          </AlertDescription>
        </Alert>
      )}

      {/* Status do Sistema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRun ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : lastRun ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status do Cron</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {cronOk ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{cronOk ? 'OK' : 'Falhou'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última execução</p>
                <p className="text-sm font-medium mt-1">{timeSinceLastRun}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="text-sm font-medium mt-1">{lastRun.duration_ms}ms</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alertas ativos</p>
                <p className="text-sm font-medium mt-1">
                  <Badge variant={activeAlertsCount > 0 ? 'destructive' : 'secondary'}>
                    {activeAlertsCount}
                  </Badge>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
          )}
        </CardContent>
      </Card>

      {/* Pagamentos Inconsistentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Pagamentos Inconsistentes
            </span>
            <Badge variant={hasInconsistencies ? 'destructive' : 'secondary'}>
              {inconsistentPayments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInconsistent ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : inconsistentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma inconsistência encontrada. ✅</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inconsistentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{truncateId(p.order_id!)}</TableCell>
                      <TableCell className="font-mono text-xs">{truncateId(p.id)}</TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(p.paid_at || p.created_at), { locale: ptBR, addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceReconcile.mutate(p.id)}
                          disabled={forceReconcile.isPending}
                        >
                          {forceReconcile.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span className="ml-1">Reconciliar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas do Sistema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Alertas do Sistema</span>
            <Select
              value={severityFilter || 'all'}
              onValueChange={(v) => setSeverityFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAlerts ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} className={alert.severity === 'critical' && !alert.resolved ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs">{alert.alert_type}</TableCell>
                      <TableCell>
                        <Badge variant={severityColors[alert.severity] as any || 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{alert.message}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.created_at), { locale: ptBR, addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {alert.resolved ? (
                          <Badge variant="outline">Resolvido</Badge>
                        ) : (
                          <Badge variant="destructive">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resolveAlert.mutate(alert.id)}
                            disabled={resolveAlert.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="ml-1 hidden sm:inline">Resolver</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
