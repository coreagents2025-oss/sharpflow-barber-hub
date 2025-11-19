import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useCommission } from '@/hooks/useCommission';

interface Barber {
  id: string;
  name: string;
}

interface CommissionConfigCardProps {
  barber: Barber;
  barbershopId: string;
  onSaved: () => void;
}

export const CommissionConfigCard = ({ barber, barbershopId, onSaved }: CommissionConfigCardProps) => {
  const { getCommissionConfig, updateCommissionConfig, loading } = useCommission(barbershopId);
  const [config, setConfig] = useState({
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: 50,
    minimum_services: 0,
    apply_to_completed_only: true,
    is_active: true
  });

  useEffect(() => {
    loadConfig();
  }, [barber.id]);

  const loadConfig = async () => {
    const data = await getCommissionConfig(barber.id);
    if (data) {
      setConfig({
        commission_type: data.commission_type as 'percentage' | 'fixed',
        commission_value: Number(data.commission_value),
        minimum_services: data.minimum_services,
        apply_to_completed_only: data.apply_to_completed_only,
        is_active: data.is_active
      });
    }
  };

  const handleSave = async () => {
    const success = await updateCommissionConfig(barber.id, config);
    if (success) {
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{barber.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Comissão Ativa</Label>
          <Switch
            checked={config.is_active}
            onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
          />
        </div>

        <div>
          <Label>Tipo de Comissão</Label>
          <Select
            value={config.commission_type}
            onValueChange={(value: any) => setConfig({ ...config, commission_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Porcentagem (%)</SelectItem>
              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>
            {config.commission_type === 'percentage' ? 'Porcentagem (%)' : 'Valor por Serviço (R$)'}
          </Label>
          <Input
            type="number"
            step="0.01"
            value={config.commission_value}
            onChange={(e) => setConfig({ ...config, commission_value: parseFloat(e.target.value) })}
          />
        </div>

        <div>
          <Label>Mínimo de Serviços</Label>
          <Input
            type="number"
            value={config.minimum_services}
            onChange={(e) => setConfig({ ...config, minimum_services: parseInt(e.target.value) })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Apenas Serviços Concluídos</Label>
          <Switch
            checked={config.apply_to_completed_only}
            onCheckedChange={(checked) => setConfig({ ...config, apply_to_completed_only: checked })}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </CardContent>
    </Card>
  );
};
