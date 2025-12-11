import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Users, MapPin, Plane, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, useUpdateCustomerType, CustomerWithStats } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'all' | 'local' | 'tourist'>('all');
  
  const { data: customers, isLoading } = useCustomers(filterType);
  const updateCustomerType = useUpdateCustomerType();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleTypeChange = async (customerId: string, newType: 'local' | 'tourist') => {
    try {
      await updateCustomerType.mutateAsync({ customerId, customerType: newType });
      toast({
        title: 'Tipo atualizado',
        description: 'O tipo do cliente foi alterado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o tipo do cliente.',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    if (!customers || customers.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Não há clientes para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Nome', 'Telefone', 'Tipo', 'Último Pedido', 'Total Gasto', 'Qtd Pedidos'];
    const rows = customers.map((c) => [
      c.name || 'Sem nome',
      c.phone,
      c.customer_type === 'local' ? 'Morador' : 'Turista',
      c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('pt-BR') : '-',
      c.total_spent.toFixed(2),
      c.order_count.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportado!',
      description: 'O arquivo CSV foi baixado.',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const localCount = customers?.filter((c) => c.customer_type === 'local').length || 0;
  const touristCount = customers?.filter((c) => c.customer_type === 'tourist').length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                CRM - Clientes
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <MapPin className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{localCount}</p>
                  <p className="text-sm text-muted-foreground">Moradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Plane className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{touristCount}</p>
                  <p className="text-sm text-muted-foreground">Turistas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'local' | 'tourist')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="local">Moradores</SelectItem>
                <SelectItem value="tourist">Turistas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : customers && customers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Último Pedido</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name || 'Sem nome'}</TableCell>
                        <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                        <TableCell>
                          <Select
                            value={customer.customer_type || 'tourist'}
                            onValueChange={(v) => handleTypeChange(customer.id, v as 'local' | 'tourist')}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-green-500" />
                                  Morador
                                </div>
                              </SelectItem>
                              <SelectItem value="tourist">
                                <div className="flex items-center gap-2">
                                  <Plane className="w-3 h-3 text-blue-500" />
                                  Turista
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(customer.last_order_date)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(customer.total_spent)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({customer.order_count} pedidos)
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
