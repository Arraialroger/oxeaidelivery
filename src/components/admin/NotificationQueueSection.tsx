import { useNotificationQueue } from '@/hooks/useNotificationQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCircle2, Clock, AlertTriangle, Loader2, Activity, Send, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400' },
  processing: { label: 'Processando', variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400' },
  sent: { label: 'Enviada', variant: 'outline', className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

export function NotificationQueueSection() {
  const {
    notifications,
    loadingNotifications,
    pendingCount,
    failedCount,
    successRate,
    lastSent,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    triggerHealthCheck,
  } = useNotificationQueue();

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> Fila de Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-2xl font-bold">{pendingCount}</span>
                <span className="text-xs text-muted-foreground ml-1">pendentes</span>
              </div>
              {failedCount > 0 && (
                <div>
                  <span className="text-lg font-semibold text-destructive">{failedCount}</span>
                  <span className="text-xs text-destructive ml-1">falhadas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Taxa de Sucesso (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {successRate !== null ? (
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${successRate >= 90 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>
                  {successRate}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Sem dados</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Última Enviada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastSent ? (
              <div>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(lastSent.sent_at!), { locale: ptBR, addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Canal: {lastSent.channel}</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma ainda</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Button */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5" /> Testes do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => triggerHealthCheck.mutate()}
              disabled={triggerHealthCheck.isPending}
              variant="outline"
            >
              {triggerHealthCheck.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              Disparar Health-check manual
            </Button>
            <p className="text-xs text-muted-foreground">
              Executa o health-check e verifica se alertas críticos geram notificações na fila.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Status das Notificações
            </span>
            <div className="flex items-center gap-2">
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter || 'all'} onValueChange={(v) => setChannelFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNotifications ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação na fila.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Última tentativa</TableHead>
                    <TableHead>Tempo na fila</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => {
                    const cfg = statusConfig[n.status] || statusConfig.pending;
                    return (
                      <TableRow key={n.id} className={n.status === 'failed' ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs font-medium">{n.channel}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className={cfg.className}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{n.attempts}/{n.max_attempts}</TableCell>
                        <TableCell className="text-xs">
                          {n.last_attempt_at ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(n.last_attempt_at), { locale: ptBR, addSuffix: true })}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-destructive">
                          {n.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
