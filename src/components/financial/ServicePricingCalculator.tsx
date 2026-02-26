import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DollarSign, TrendingUp, Calculator, Percent } from 'lucide-react';

export function ServicePricingCalculator() {
  const [fixedCosts, setFixedCosts] = useState({
    rent: 0,
    utilities: 0,
    products: 0,
    tools: 0,
    marketing: 0,
    other: 0,
  });

  const [variableCost, setVariableCost] = useState(0);
  const [serviceTime, setServiceTime] = useState(30);
  const [servicesPerMonth, setServicesPerMonth] = useState(100);
  const [profitMargin, setProfitMargin] = useState(30);

  const totalFixedCosts = useMemo(
    () => Object.values(fixedCosts).reduce((sum, v) => sum + v, 0),
    [fixedCosts]
  );

  const fixedCostPerService = servicesPerMonth > 0 ? totalFixedCosts / servicesPerMonth : 0;
  const totalCostPerService = fixedCostPerService + variableCost;
  const suggestedPrice = profitMargin < 100 ? totalCostPerService / (1 - profitMargin / 100) : 0;
  const profitPerService = suggestedPrice - totalCostPerService;

  const handleFixedCost = (key: keyof typeof fixedCosts, value: string) => {
    setFixedCosts(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const fixedCostFields = [
    { key: 'rent' as const, label: 'Aluguel', placeholder: 'Ex: 2000' },
    { key: 'utilities' as const, label: 'Água / Luz / Internet', placeholder: 'Ex: 500' },
    { key: 'products' as const, label: 'Produtos (shampoo, cera, lâminas)', placeholder: 'Ex: 800' },
    { key: 'tools' as const, label: 'Ferramentas / Manutenção', placeholder: 'Ex: 300' },
    { key: 'marketing' as const, label: 'Marketing', placeholder: 'Ex: 200' },
    { key: 'other' as const, label: 'Outros custos fixos', placeholder: 'Ex: 100' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fixed Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              Custos Fixos (Mensais)
            </CardTitle>
            <CardDescription>Despesas que você paga todo mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixedCostFields.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={placeholder}
                    value={fixedCosts[key] || ''}
                    onChange={(e) => handleFixedCost(key, e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Fixo Mensal</span>
                <span className="text-red-600">R$ {totalFixedCosts.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variable Costs + Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-500" />
              Custos Variáveis e Parâmetros
            </CardTitle>
            <CardDescription>Custos por serviço e volume estimado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Custo de produto por serviço</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 3.00"
                  value={variableCost || ''}
                  onChange={(e) => setVariableCost(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tempo médio do serviço (minutos)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 30"
                value={serviceTime || ''}
                onChange={(e) => setServiceTime(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Serviços estimados por mês</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={servicesPerMonth || ''}
                onChange={(e) => setServicesPerMonth(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Margem de lucro desejada</Label>
                <span className="text-sm font-bold text-primary">{profitMargin}%</span>
              </div>
              <Slider
                value={[profitMargin]}
                onValueChange={(v) => setProfitMargin(v[0])}
                min={5}
                max={80}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                <span>80%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Resultado
            </CardTitle>
            <CardDescription>Preço sugerido para seu serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-background border">
              <p className="text-xs text-muted-foreground mb-1">Preço Sugerido</p>
              <p className="text-3xl font-bold text-primary">
                R$ {suggestedPrice.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo fixo por serviço</span>
                <span className="font-medium">R$ {fixedCostPerService.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo variável por serviço</span>
                <span className="font-medium">R$ {variableCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Custo total por serviço</span>
                <span className="font-semibold text-red-600">R$ {totalCostPerService.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro por serviço</span>
                <span className="font-semibold text-green-600">R$ {profitPerService.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de lucro</span>
                <span className="font-semibold">{profitMargin}%</span>
              </div>
            </div>

            {/* Visual breakdown bar */}
            {suggestedPrice > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Composição do preço</p>
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${(fixedCostPerService / suggestedPrice) * 100}%` }}
                    title="Custo Fixo"
                  />
                  <div
                    className="bg-orange-400 transition-all"
                    style={{ width: `${(variableCost / suggestedPrice) * 100}%` }}
                    title="Custo Variável"
                  />
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(profitPerService / suggestedPrice) * 100}%` }}
                    title="Lucro"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400" /> Fixo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-400" /> Variável
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Lucro
                  </span>
                </div>
              </div>
            )}

            {servicesPerMonth > 0 && suggestedPrice > 0 && (
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground mb-1">Faturamento mensal estimado</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {(suggestedPrice * servicesPerMonth).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
