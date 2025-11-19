import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommission, CommissionCalculation } from '@/hooks/useCommission';
import { Calendar } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface CommissionCalculatorProps {
  barbers: Array<{ id: string; name: string }>;
  barbershopId: string;
  onPaymentRecorded: () => void;
}

export const CommissionCalculator = ({ barbers, barbershopId, onPaymentRecorded }: CommissionCalculatorProps) => {
  const { calculateCommissions, recordCommissionPayment, loading } = useCommission(barbershopId);
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarbers, setSelectedBarbers] = useState<string[]>([]);
  const [calculations, setCalculations] = useState<CommissionCalculation[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const handleCalculate = async () => {
    let start = startDate;
    let end = endDate;

    if (period === 'week') {
      const today = new Date();
      start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (period === 'month') {
      const today = new Date();
      start = format(startOfMonth(today), 'yyyy-MM-dd');
      end = format(endOfMonth(today), 'yyyy-MM-dd');
    }

    const barbersToCalculate = selectedBarbers.length > 0 ? selectedBarbers : barbers.map(b => b.id);
    const results = await calculateCommissions(barbersToCalculate, start, end);
    
    const withAdjustments = results.map(r => ({
      ...r,
      manual_adjustments: adjustments[r.barber_id] || 0,
      final_amount: r.commission_amount + (adjustments[r.barber_id] || 0)
    }));
    
    setCalculations(withAdjustments);
    setStartDate(start);
    setEndDate(end);
  };

  const handleAdjustmentChange = (barberId: string, value: number) => {
    setAdjustments({ ...adjustments, [barberId]: value });
    setCalculations(calculations.map(calc => 
      calc.barber_id === barberId
        ? { ...calc, manual_adjustments: value, final_amount: calc.commission_amount + value }
        : calc
    ));
  };

  const handleRecordPayment = async (calculation: CommissionCalculation) => {
    const success = await recordCommissionPayment({
      barber_id: calculation.barber_id,
      period_start: startDate,
      period_end: endDate,
      total_services: calculation.total_services,
      total_amount: calculation.total_amount,
      commission_amount: calculation.commission_amount,
      manual_adjustments: calculation.manual_adjustments,
      final_amount: calculation.final_amount
    });

    if (success) {
      onPaymentRecorded();
      setCalculations(calculations.filter(c => c.barber_id !== calculation.barber_id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calcular Comissões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Período</Label>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div className={period === 'custom' ? 'md:col-span-3' : 'md:col-span-2'}>
            <Label>Barbeiros</Label>
            <Select
              value={selectedBarbers.length > 0 ? selectedBarbers[0] : 'all'}
              onValueChange={(value) => setSelectedBarbers(value === 'all' ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os barbeiros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os barbeiros</SelectItem>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleCalculate} disabled={loading} className="w-full">
          <Calendar className="h-4 w-4 mr-2" />
          {loading ? 'Calculando...' : 'Calcular Comissões'}
        </Button>

        {calculations.length > 0 && (
          <div className="border rounded-lg mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead className="text-center">Serviços</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Ajustes</TableHead>
                  <TableHead className="text-right">Total Final</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((calc) => (
                  <TableRow key={calc.barber_id}>
                    <TableCell className="font-medium">{calc.barber_name}</TableCell>
                    <TableCell className="text-center">{calc.total_services}</TableCell>
                    <TableCell className="text-right">R$ {calc.total_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {calc.commission_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={calc.manual_adjustments}
                        onChange={(e) => handleAdjustmentChange(calc.barber_id, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      R$ {calc.final_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleRecordPayment(calc)}
                        disabled={loading}
                      >
                        Pagar
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
  );
};
