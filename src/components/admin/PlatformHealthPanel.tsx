import { useSystemHealth } from '@/hooks/useSystemHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, ShieldAlert, Info, Clock, Loader2, Zap, HeartPulse, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severityConfig = {
  critical: { icon: ShieldAlert, label: 'Crítico', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  warning: { icon: AlertTriangle, label: 'Aviso', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  info: { icon: Info, label: 'Info', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

export function PlatformHealthPanel() {
  const { events, loadingEvents, counts, lastCritical, avgConfirmationTime, hourlyData, testAlert } = useSystemHealth();

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Críticos 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${counts.critical > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {counts.critical}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> Warnings 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${counts.warning > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
              {counts.warning}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Último Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastCritical ? (
              <div>
                <p className="text-sm font-semibold text-red-600">{(lastCritical as any).event_type}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date((lastCritical as any).created_at), { locale: ptBR, addSuffix: true })}
                </p>
              </div>
            ) : (
              <span className="text-sm text-green-600 font-medium">Nenhum ✓</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Timer className="w-4 h-4" /> Tempo Médio Confirmação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avgConfirmationTime !== null && avgConfirmationTime !== undefined ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {avgConfirmationTime < 60 ? avgConfirmationTime : Math.round(avgConfirmationTime / 60)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {avgConfirmationTime < 60 ? 'seg' : 'min'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Sem dados</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Button */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5" /> Teste de Alerta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => testAlert.mutate()}
              disabled={testAlert.isPending}
              variant="outline"
            >
              {testAlert.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <HeartPulse className="w-4 h-4 mr-2" />
              )}
              Disparar alerta de teste
            </Button>
            <p className="text-xs text-muted-foreground">
              Cria um evento crítico de teste → enfileira no Telegram → envia em até 2 min.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Chart */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Falhas por Hora (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(v) => new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v as string).toLocaleString('pt-BR')}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="critical" fill="hsl(0, 72%, 51%)" name="Críticos" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="warning" fill="hsl(38, 92%, 50%)" name="Warnings" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <HeartPulse className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum evento de saúde registrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map((e: any) => {
                    const cfg = severityConfig[e.severity as keyof typeof severityConfig] || severityConfig.info;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={e.id} className={e.severity === 'critical' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                        <TableCell>
                          <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{e.event_type}</TableCell>
                        <TableCell className="text-xs">{e.source}</TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">{e.message}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(e.created_at), { locale: ptBR, addSuffix: true })}
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
