import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { useSubscriptionManagement, type SubscriptionPlan, type PlanFormData } from "@/hooks/useSubscriptionManagement";
import { SubscriptionDashboard } from "@/components/subscriptions/SubscriptionDashboard";
import { PlanFormDialog } from "@/components/subscriptions/PlanFormDialog";
import { ActiveSubscriptionsList } from "@/components/subscriptions/ActiveSubscriptionsList";
import { PaymentHistoryTable } from "@/components/subscriptions/PaymentHistoryTable";
import { PlanBenefitsList } from "@/components/subscriptions/PlanBenefitsList";
import { RewardsManager } from "@/components/subscriptions/RewardsManager";
import { MigrationImportTab } from "@/components/subscriptions/MigrationImportTab";
import { AddSubscriberDialog } from "@/components/subscriptions/AddSubscriberDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [addSubscriberOpen, setAddSubscriberOpen] = useState(false);
  const isMobile = useIsMobile();

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
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Assinaturas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              Gerencie planos, assinaturas ativas, cobranças e recompensas
            </p>
          </div>
          <Button onClick={openNew} size={isMobile ? "sm" : "default"} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Plano</span>
          </Button>
        </div>

        {/* Metrics - collapsible on mobile */}
        {isMobile ? (
          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground">
                Métricas
                {metricsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SubscriptionDashboard metrics={metrics} />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SubscriptionDashboard metrics={metrics} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="plans" className="space-y-3 sm:space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5">
              <TabsTrigger value="plans" className="text-xs sm:text-sm px-3">Planos</TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm px-3">Ativas</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm px-3">Cobranças</TabsTrigger>
              <TabsTrigger value="rewards" className="text-xs sm:text-sm px-3">Recompensas</TabsTrigger>
              <TabsTrigger value="migration" className="text-xs sm:text-sm px-3">Migração</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-2 px-3 pt-3 sm:px-6 sm:pt-6 sm:pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base truncate">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? "default" : "secondary"} className="shrink-0 text-xs">
                        {plan.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pb-3 sm:px-6 sm:pb-6 sm:space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground text-xs">Preço</span>
                        <span className="font-semibold text-xs">R$ {Number(plan.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground text-xs">Créditos</span>
                        <span className="text-xs">{plan.credits_per_month}/mês</span>
                      </div>
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground text-xs">Recorrência</span>
                        <span className="text-xs">{intervalMap[plan.billing_interval] || plan.billing_interval}</span>
                      </div>
                      <div className="flex justify-between col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground text-xs">Cobrança</span>
                        <span className="text-xs">{methodMap[plan.billing_method] || plan.billing_method}</span>
                      </div>
                    </div>

                    {(plan.benefits && plan.benefits.length > 0) || plan.points_config ? (
                      <div className="pt-2 border-t">
                        <PlanBenefitsList benefits={plan.benefits || []} pointsConfig={plan.points_config} />
                      </div>
                    ) : null}

                    <div className="flex gap-1.5 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(plan)}>
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => togglePlanActive(plan.id, !plan.is_active)}>
                        {plan.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => deletePlan(plan.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {plans.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>Nenhum plano criado ainda.</p>
                  <Button variant="outline" className="mt-3" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Criar primeiro plano
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setAddSubscriberOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Assinatura
                </Button>
              </div>
              <ActiveSubscriptionsList
                subscriptions={activeSubscriptions}
                onRenew={renewSubscription}
                onCancel={cancelSubscription}
                onInvite={inviteSubscriber}
              />
            </div>
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

      <AddSubscriberDialog
        open={addSubscriberOpen}
        onOpenChange={setAddSubscriberOpen}
        plans={plans}
        onSuccess={refetch}
      />
    </div>
  );
}
