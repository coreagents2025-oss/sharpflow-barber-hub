import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useSubscriptionManagement, type SubscriptionPlan, type PlanFormData } from "@/hooks/useSubscriptionManagement";
import { SubscriptionDashboard } from "@/components/subscriptions/SubscriptionDashboard";
import { PlanFormDialog } from "@/components/subscriptions/PlanFormDialog";
import { ActiveSubscriptionsList } from "@/components/subscriptions/ActiveSubscriptionsList";
import { PaymentHistoryTable } from "@/components/subscriptions/PaymentHistoryTable";
import { PlanBenefitsList } from "@/components/subscriptions/PlanBenefitsList";
import { RewardsManager } from "@/components/subscriptions/RewardsManager";
import { MigrationImportTab } from "@/components/subscriptions/MigrationImportTab";

const intervalMap: Record<string, string> = { weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" };
const methodMap: Record<string, string> = { pix: "PIX", card: "Cartão", boleto: "Boleto", cash: "Dinheiro" };

export default function SubscriptionsManagement() {
  const {
    plans, activeSubscriptions, payments, rewards, loading, metrics,
    createPlan, updatePlan, togglePlanActive, deletePlan,
    markPaymentPaid, renewSubscription, cancelSubscription,
    createReward, updateReward, toggleRewardActive, deleteReward,
    refetch,
  } = useSubscriptionManagement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSubmit = async (data: PlanFormData) => {
    if (editingPlan) {
      return updatePlan(editingPlan.id, data);
    }
    return createPlan(data);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Assinaturas</h1>
            <p className="text-muted-foreground text-sm">Gerencie planos, assinaturas ativas, cobranças e recompensas</p>
          </div>
          <Button onClick={openNew} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Novo Plano
          </Button>
        </div>

        <SubscriptionDashboard metrics={metrics} />

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="payments">Cobranças</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
            <TabsTrigger value="migration">Migração</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço</span>
                      <span className="font-semibold">R$ {Number(plan.price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Créditos/mês</span>
                      <span>{plan.credits_per_month}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recorrência</span>
                      <span>{intervalMap[plan.billing_interval] || plan.billing_interval}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cobrança</span>
                      <span>{methodMap[plan.billing_method] || plan.billing_method}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Auto-renovar</span>
                      <span>{plan.auto_renew ? "Sim" : "Não"}</span>
                    </div>

                    {/* Benefits & Points */}
                    {(plan.benefits && plan.benefits.length > 0) || plan.points_config ? (
                      <div className="pt-2 border-t">
                        <PlanBenefitsList benefits={plan.benefits || []} pointsConfig={plan.points_config} />
                      </div>
                    ) : null}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(plan)}>
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => togglePlanActive(plan.id, !plan.is_active)}>
                        {plan.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePlan(plan.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {plans.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>Nenhum plano criado ainda.</p>
                  <Button variant="outline" className="mt-3" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Criar primeiro plano
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <ActiveSubscriptionsList
              subscriptions={activeSubscriptions}
              onRenew={renewSubscription}
              onCancel={cancelSubscription}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentHistoryTable payments={payments} onMarkPaid={markPaymentPaid} />
          </TabsContent>

          <TabsContent value="rewards">
            <RewardsManager
              rewards={rewards}
              onCreate={createReward}
              onUpdate={updateReward}
              onToggle={toggleRewardActive}
              onDelete={deleteReward}
            />
          </TabsContent>

          <TabsContent value="migration">
            <MigrationImportTab
              plans={plans}
              onImportComplete={refetch}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PlanFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingPlan={editingPlan}
      />
    </div>
  );
}
