import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Plus, Trash2, Gift, Star, Scissors } from "lucide-react";
import type { PlanFormData, SubscriptionPlan, BenefitFormData, PointsConfigFormData } from "@/hooks/useSubscriptionManagement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlanFormData) => Promise<boolean>;
  editingPlan?: SubscriptionPlan | null;
}

const defaultBenefit: BenefitFormData = {
  service_id: null,
  custom_name: "",
  custom_description: "",
  quantity_per_cycle: 1,
  benefit_type: "custom",
  discount_value: 0,
  discount_type: "percentage",
};

const defaultPointsConfig: PointsConfigFormData = {
  points_per_visit: 1,
  points_per_real_spent: 0,
  bonus_points_monthly: 0,
};

const defaultForm: PlanFormData = {
  name: "",
  description: "",
  price: 0,
  credits_per_month: 4,
  discount_percentage: 0,
  billing_interval: "monthly",
  billing_method: "pix",
  auto_renew: true,
  reminder_days_before: 3,
  benefits: [],
  points_config: { ...defaultPointsConfig },
};

export function PlanFormDialog({ open, onOpenChange, onSubmit, editingPlan }: Props) {
  const { barbershopId } = useAuth();
  const [form, setForm] = useState<PlanFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);

  useEffect(() => {
    if (!barbershopId || !open) return;
    supabase
      .from("services")
      .select("id, name, price")
      .eq("barbershop_id", barbershopId)
      .eq("is_active", true)
      .eq("is_subscription_plan", false)
      .order("name")
      .then(({ data }) => setServices((data as any) || []));
  }, [barbershopId, open]);

  useEffect(() => {
    if (editingPlan) {
      setForm({
        name: editingPlan.name,
        description: editingPlan.description || "",
        price: editingPlan.price,
        credits_per_month: editingPlan.credits_per_month,
        discount_percentage: editingPlan.discount_percentage || 0,
        billing_interval: editingPlan.billing_interval,
        billing_method: editingPlan.billing_method,
        auto_renew: editingPlan.auto_renew,
        reminder_days_before: editingPlan.reminder_days_before,
        benefits: (editingPlan.benefits || []).map(b => ({
          id: b.id,
          service_id: b.service_id,
          custom_name: b.custom_name || "",
          custom_description: b.custom_description || "",
          quantity_per_cycle: b.quantity_per_cycle,
          benefit_type: b.benefit_type,
          discount_value: b.discount_value,
          discount_type: b.discount_type,
        })),
        points_config: editingPlan.points_config
          ? {
              points_per_visit: editingPlan.points_config.points_per_visit,
              points_per_real_spent: editingPlan.points_config.points_per_real_spent,
              bonus_points_monthly: editingPlan.points_config.bonus_points_monthly,
            }
          : { ...defaultPointsConfig },
      });
    } else {
      setForm(defaultForm);
    }
  }, [editingPlan, open]);

  const handleSubmit = async () => {
    if (!form.name || form.price <= 0) return;
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const addServiceBenefit = () => {
    setForm(f => ({
      ...f,
      benefits: [...(f.benefits || []), { ...defaultBenefit, benefit_type: "service", service_id: services[0]?.id || null }],
    }));
  };

  const addCustomBenefit = () => {
    setForm(f => ({
      ...f,
      benefits: [...(f.benefits || []), { ...defaultBenefit }],
    }));
  };

  const updateBenefit = (idx: number, updates: Partial<BenefitFormData>) => {
    setForm(f => ({
      ...f,
      benefits: (f.benefits || []).map((b, i) => (i === idx ? { ...b, ...updates } : b)),
    }));
  };

  const removeBenefit = (idx: number) => {
    setForm(f => ({
      ...f,
      benefits: (f.benefits || []).filter((_, i) => i !== idx),
    }));
  };

  const updatePointsConfig = (updates: Partial<PointsConfigFormData>) => {
    setForm(f => ({
      ...f,
      points_config: { ...(f.points_config || defaultPointsConfig), ...updates },
    }));
  };

  const serviceBenefits = (form.benefits || []).filter(b => b.benefit_type === "service");
  const customBenefits = (form.benefits || []).filter(b => b.benefit_type !== "service");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano de Assinatura"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Basic info */}
          <div>
            <Label>Nome do Plano</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Plano Mensal Premium" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do plano..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Créditos/mês</Label>
              <Input type="number" min={1} value={form.credits_per_month} onChange={(e) => setForm({ ...form, credits_per_month: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recorrência</Label>
              <Select value={form.billing_interval} onValueChange={(v) => setForm({ ...form, billing_interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Cobrança</Label>
              <Select value={form.billing_method} onValueChange={(v) => setForm({ ...form, billing_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desconto (%)</Label>
              <Input type="number" min={0} max={100} value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Lembrete (dias antes)</Label>
              <Input type="number" min={0} value={form.reminder_days_before} onChange={(e) => setForm({ ...form, reminder_days_before: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.auto_renew} onCheckedChange={(v) => setForm({ ...form, auto_renew: v })} />
            <Label>Renovação automática</Label>
          </div>

          {/* Service Benefits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scissors className="h-4 w-4" /> Serviços Inclusos
                </CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addServiceBenefit} disabled={services.length === 0}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceBenefits.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum serviço incluso. Adicione serviços como benefício do plano.</p>
              )}
              {(form.benefits || []).map((benefit, idx) => {
                if (benefit.benefit_type !== "service") return null;
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 rounded-md border bg-muted/30">
                    <div className="flex-1">
                      <Label className="text-xs">Serviço</Label>
                      <Select value={benefit.service_id || ""} onValueChange={(v) => updateBenefit(idx, { service_id: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} — R$ {Number(s.price).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="w-full sm:w-20">
                        <Label className="text-xs">Qtd/ciclo</Label>
                        <Input className="h-9" type="number" min={1} value={benefit.quantity_per_cycle} onChange={(e) => updateBenefit(idx, { quantity_per_cycle: Number(e.target.value) })} />
                      </div>
                      <div className="w-full sm:w-20">
                        <Label className="text-xs">Desc. %</Label>
                        <Input className="h-9" type="number" min={0} max={100} value={benefit.discount_value} onChange={(e) => updateBenefit(idx, { discount_value: Number(e.target.value) })} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeBenefit(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Custom Benefits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Benefícios Extras
                </CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addCustomBenefit}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customBenefits.length === 0 && (
                <p className="text-sm text-muted-foreground">Ex: "Cerveja grátis", "Produto 20% off", etc.</p>
              )}
              {(form.benefits || []).map((benefit, idx) => {
                if (benefit.benefit_type === "service") return null;
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 rounded-md border bg-muted/30">
                    <div className="flex-1">
                      <Label className="text-xs">Nome</Label>
                      <Input className="h-9" value={benefit.custom_name} onChange={(e) => updateBenefit(idx, { custom_name: e.target.value })} placeholder="Ex: Cerveja grátis" />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="w-full sm:w-20">
                        <Label className="text-xs">Qtd/ciclo</Label>
                        <Input className="h-9" type="number" min={1} value={benefit.quantity_per_cycle} onChange={(e) => updateBenefit(idx, { quantity_per_cycle: Number(e.target.value) })} />
                      </div>
                      <div className="w-full sm:w-24">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={benefit.benefit_type} onValueChange={(v) => updateBenefit(idx, { benefit_type: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="product">Produto</SelectItem>
                            <SelectItem value="discount">Desconto</SelectItem>
                            <SelectItem value="custom">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeBenefit(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Points Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" /> Programa de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Pontos por visita</Label>
                  <Input type="number" min={0} value={form.points_config?.points_per_visit ?? 0} onChange={(e) => updatePointsConfig({ points_per_visit: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Pontos por R$ gasto</Label>
                  <Input type="number" min={0} step={0.1} value={form.points_config?.points_per_real_spent ?? 0} onChange={(e) => updatePointsConfig({ points_per_real_spent: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Bônus mensal</Label>
                  <Input type="number" min={0} value={form.points_config?.bonus_points_monthly ?? 0} onChange={(e) => updatePointsConfig({ bonus_points_monthly: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : editingPlan ? "Salvar" : "Criar Plano"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
