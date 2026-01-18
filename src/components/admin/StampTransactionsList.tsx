import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStampTransactions } from '@/hooks/useStampTransactions';
import { Gift, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';

export function StampTransactionsList() {
  const { data: transactions, isLoading } = useStampTransactions(100);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.customer?.phone?.includes(search) ||
      tx.notes?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || tx.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit':
        return 'Crédito';
      case 'redemption':
        return 'Resgate';
      case 'adjustment':
        return 'Ajuste';
      case 'expiration':
        return 'Expiração';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'credit':
        return 'default';
      case 'redemption':
        return 'secondary';
      case 'adjustment':
        return 'outline';
      case 'expiration':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Calculate stats
  const stats = transactions?.reduce(
    (acc, tx) => {
      if (tx.type === 'credit') {
        acc.totalCredits += tx.amount;
      } else if (tx.type === 'redemption') {
        acc.totalRedemptions += Math.abs(tx.amount);
      }
      return acc;
    },
    { totalCredits: 0, totalRedemptions: 0 }
  ) || { totalCredits: 0, totalRedemptions: 0 };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selos Creditados</p>
                <p className="text-xl font-bold text-primary">{stats.totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50 border-secondary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                <Gift className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Brindes Resgatados</p>
                <p className="text-xl font-bold">{stats.totalRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="credit">Créditos</SelectItem>
            <SelectItem value="redemption">Resgates</SelectItem>
            <SelectItem value="adjustment">Ajustes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!filteredTransactions?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          tx.type === 'credit'
                            ? 'bg-primary/10'
                            : tx.type === 'redemption'
                            ? 'bg-secondary'
                            : 'bg-muted'
                        }`}
                      >
                        {tx.type === 'credit' ? (
                          <TrendingUp className="w-4 h-4 text-primary" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {tx.customer?.name || tx.customer?.phone || 'Cliente desconhecido'}
                        </p>
                        {tx.customer?.name && (
                          <p className="text-xs text-muted-foreground">{tx.customer.phone}</p>
                        )}
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {tx.created_at
                            ? format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getTypeBadgeVariant(tx.type)} className="mb-1">
                        {getTypeLabel(tx.type)}
                      </Badge>
                      <p
                        className={`text-sm font-bold ${
                          tx.amount > 0 ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount} selo{Math.abs(tx.amount) !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: {tx.balance_after}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
