import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Trophy, Star } from "lucide-react";
import type { LoyaltyReward, RewardFormData } from "@/hooks/useSubscriptionManagement";

interface Props {
  rewards: LoyaltyReward[];
  onCreate: (data: RewardFormData) => Promise<boolean>;
  onUpdate: (id: string, data: RewardFormData) => Promise<boolean>;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => Promise<boolean>;
}

const typeLabels: Record<string, string> = {
  service: "Serviço",
  product: "Produto",
  discount: "Desconto",
  custom: "Outro",
};

const defaultRewardForm: RewardFormData = {
  name: "",
  description: "",
  reward_type: "custom",
  points_required: 100,
};

export function RewardsManager({ rewards, onCreate, onUpdate, onToggle, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState<RewardFormData>(defaultRewardForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(defaultRewardForm);
    setDialogOpen(true);
  };

  const openEdit = (r: LoyaltyReward) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || "",
      reward_type: r.reward_type,
      points_required: r.points_required,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || form.points_required <= 0) return;
    setSaving(true);
    const ok = editing ? await onUpdate(editing.id, form) : await onCreate(form);
    setSaving(false);
    if (ok) setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Catálogo de Recompensas</h3>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova Recompensa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <Card key={reward.id} className={!reward.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{reward.name}</CardTitle>
                <Badge variant={reward.is_active ? "default" : "secondary"}>
                  {reward.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {reward.description && (
                <p className="text-sm text-muted-foreground">{reward.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span>{typeLabels[reward.reward_type] || reward.reward_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pontos necessários</span>
                <span className="font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {reward.points_required}
                </span>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(reward)}>
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => onToggle(reward.id, !reward.is_active)}>
                  {reward.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(reward.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rewards.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma recompensa criada ainda.</p>
            <p className="text-xs mt-1">Crie prêmios que os assinantes podem resgatar com pontos acumulados.</p>
            <Button variant="outline" className="mt-3" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Criar primeira recompensa
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Recompensa" : "Nova Recompensa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Corte grátis" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da recompensa..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                    <SelectItem value="discount">Desconto</SelectItem>
                    <SelectItem value="custom">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pontos necessários</Label>
                <Input type="number" min={1} value={form.points_required} onChange={(e) => setForm({ ...form, points_required: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
