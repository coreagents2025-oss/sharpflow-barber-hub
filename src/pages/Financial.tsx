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
import { startOfMonth, endOfMonth, format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function Financial() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string>('');
  const [barbers, setBarbers] = useState<Array<{ id: string; name: string }>>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<any[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [period, setPeriod] = useState<'30' | '60' | '90' | 'custom'>('30');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  const handlePeriodChange = (value: '30' | '60' | '90' | 'custom') => {
    setPeriod(value);
    
    if (value !== 'custom') {
      const days = parseInt(value);
      const end = new Date();
      const start = subDays(end, days);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">Financeiro</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {period === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg md:text-2xl font-bold text-green-600">
                R$ {summary.income.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg md:text-2xl font-bold text-red-600">
                R$ {summary.expense.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Lucro</CardTitle>
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-lg md:text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {summary.balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Taxa Comissão</CardTitle>
              <Percent className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {summary.income > 0 ? ((summary.expense / summary.income) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="caixa" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="caixa" className="text-xs md:text-sm">💰 Caixa</TabsTrigger>
            <TabsTrigger value="comissoes" className="text-xs md:text-sm">💵 Comissões</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs md:text-sm">📈 Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="caixa" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <CardTitle className="text-lg md:text-xl">Fluxo de Caixa</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Gerencie entradas e saídas</CardDescription>
                </div>
                <Button onClick={() => setShowTransactionModal(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <CashFlowTable transactions={transactions} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Entradas vs Saídas</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyRevenue.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
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
                <CardTitle className="text-lg md:text-xl">Configuração de Comissões</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure como cada barbeiro recebe comissão</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                <CardTitle className="text-lg md:text-xl">Faturamento Mensal</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={revenueByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={60}
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
                  <CardTitle className="text-lg md:text-xl">Exportar Relatórios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-2 sm:px-6">
                  <Button variant="outline" className="w-full text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" className="w-full text-sm">
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
