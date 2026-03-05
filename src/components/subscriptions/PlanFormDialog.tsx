import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PlanFormData, SubscriptionPlan } from "@/hooks/useSubscriptionManagement";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlanFormData) => Promise<boolean>;
  editingPlan?: SubscriptionPlan | null;
}

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
};

export function PlanFormDialog({ open, onOpenChange, onSubmit, editingPlan }: Props) {
  const [form, setForm] = useState<PlanFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano de Assinatura"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : editingPlan ? "Salvar" : "Criar Plano"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
