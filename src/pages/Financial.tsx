import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, Percent, Plus, Download } from 'lucide-react';
import { TransactionModal } from '@/components/financial/TransactionModal';
import { CashFlowTable } from '@/components/financial/CashFlowTable';
import { CommissionConfigCard } from '@/components/financial/CommissionConfigCard';
import { CommissionCalculator } from '@/components/financial/CommissionCalculator';
import { useCashFlow } from '@/hooks/useCashFlow';
import { useFinancialReports } from '@/hooks/useFinancialReports';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function Financial() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string>('');
  const [barbers, setBarbers] = useState<Array<{ id: string; name: string }>>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<any[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [period, setPeriod] = useState<'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);

  const { getTransactions, getCashSummary } = useCashFlow(barbershopId);
  const { getMonthlyRevenue, getRevenueByCategory } = useFinancialReports(barbershopId);

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchBarbers();
      fetchTransactions();
      fetchSummary();
      fetchReports();
    }
  }, [barbershopId, startDate, endDate]);

  const fetchBarbershopId = async () => {
    const { data } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', user?.id)
      .single();
    
    if (data) setBarbershopId(data.barbershop_id);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .order('name');
    
    if (data) setBarbers(data);
  };

  const fetchTransactions = async () => {
    const data = await getTransactions({ start_date: startDate, end_date: endDate });
    setTransactions(data);
  };

  const fetchSummary = async () => {
    const data = await getCashSummary(startDate, endDate);
    setSummary(data);
  };

  const fetchReports = async () => {
    const revenue = await getMonthlyRevenue(6);
    setMonthlyRevenue(revenue);

    const byCategory = await getRevenueByCategory(startDate, endDate);
    setRevenueByCategory(byCategory);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {summary.income.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {summary.expense.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lucro</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {summary.balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa Comissão</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.income > 0 ? ((summary.expense / summary.income) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="caixa" className="space-y-4">
          <TabsList>
            <TabsTrigger value="caixa">💰 Caixa</TabsTrigger>
            <TabsTrigger value="comissoes">💵 Comissões</TabsTrigger>
            <TabsTrigger value="relatorios">📈 Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="caixa" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fluxo de Caixa</CardTitle>
                  <CardDescription>Gerencie entradas e saídas</CardDescription>
                </div>
                <Button onClick={() => setShowTransactionModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </CardHeader>
              <CardContent>
                <CashFlowTable transactions={transactions} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entradas vs Saídas (Últimos 7 Dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenue.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comissoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Comissões</CardTitle>
                <CardDescription>Configure como cada barbeiro recebe comissão</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barbers.map(barber => (
                    <CommissionConfigCard
                      key={barber.id}
                      barber={barber}
                      barbershopId={barbershopId}
                      onSaved={fetchBarbers}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <CommissionCalculator
              barbers={barbers}
              barbershopId={barbershopId}
              onPaymentRecorded={() => {
                fetchTransactions();
                fetchSummary();
              }}
            />
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {revenueByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exportar Relatórios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        barbershopId={barbershopId}
        onSuccess={() => {
          fetchTransactions();
          fetchSummary();
        }}
      />
    </div>
  );
}
