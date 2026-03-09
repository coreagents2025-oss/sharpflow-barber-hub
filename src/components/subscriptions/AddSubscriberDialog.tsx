import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, UserPlus, CreditCard, Calendar as CalendarLucide, Eye, EyeOff, KeyRound } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SubscriptionPlan } from '@/hooks/useSubscriptionManagement';

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: SubscriptionPlan[];
  onSuccess: () => void;
}

type Step = 'lead' | 'new-lead' | 'plan';

export function AddSubscriberDialog({ open, onOpenChange, plans, onSuccess }: Props) {
  const { barbershopId } = useAuth();
  const [step, setStep] = useState<Step>('lead');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // New lead form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);

  // Portal access fields
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessPasswordConfirm, setAccessPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createAccess, setCreateAccess] = useState(false);

  const activePlans = plans.filter(p => p.is_active);

  useEffect(() => {
    if (open && barbershopId) {
      fetchLeads('');
    }
    if (!open) {
      setStep('lead');
      setSearch('');
      setSelectedLead(null);
      setSelectedPlanId('');
      setStartDate(new Date());
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setAccessEmail('');
      setAccessPassword('');
      setAccessPasswordConfirm('');
      setShowPassword(false);
      setCreateAccess(false);
    }
  }, [open, barbershopId]);

  // Pre-fill access email when lead is selected
  useEffect(() => {
    if (selectedLead?.email) {
      setAccessEmail(selectedLead.email);
    }
  }, [selectedLead]);

  const fetchLeads = async (q: string) => {
    if (!barbershopId) return;
    setLoadingLeads(true);
    let query = supabase
      .from('leads')
      .select('id, full_name, phone, email')
      .eq('barbershop_id', barbershopId)
      .order('full_name')
      .limit(50);

    if (q.trim()) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data } = await query;
    setLeads(data || []);
    setLoadingLeads(false);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchLeads(val);
  };

  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setStep('plan');
  };

  const handleCreateLead = async () => {
    if (!barbershopId || !newName.trim() || !newPhone.trim()) return;
    setCreatingLead(true);
    try {
      const { data, error } = await supabase.rpc('find_or_create_lead', {
        _barbershop_id: barbershopId,
        _phone: newPhone.trim(),
        _full_name: newName.trim(),
        _email: newEmail.trim() || null,
        _source: 'manual',
      });
      if (error) throw error;

      const leadId = data as string;
      const { data: leadData } = await supabase
        .from('leads')
        .select('id, full_name, phone, email')
        .eq('id', leadId)
        .single();

      if (leadData) {
        setSelectedLead(leadData);
        setStep('plan');
        toast.success('Cliente cadastrado!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setCreatingLead(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedLead || !selectedPlanId || !barbershopId) return;

    const plan = activePlans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    // Validate portal access fields if enabled
    if (createAccess) {
      if (!accessEmail.trim()) {
        toast.error('Informe o email de acesso do cliente.');
        return;
      }
      if (accessPassword.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (accessPassword !== accessPasswordConfirm) {
        toast.error('As senhas não coincidem.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const intervalDays: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };
      const days = intervalDays[plan.billing_interval] || 30;
      const expiresAt = new Date(startDate);
      expiresAt.setDate(expiresAt.getDate() + days);
      const nextBilling = new Date(startDate);
      nextBilling.setDate(nextBilling.getDate() + days);

      // Verificar se já existe assinatura ativa para este lead neste plano (evitar duplicata)
      const { data: existingSub } = await supabase
        .from('client_subscriptions')
        .select('id')
        .eq('lead_id', selectedLead.id)
        .eq('plan_id', plan.id)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSub) {
        toast.error('Este cliente já possui uma assinatura ativa neste plano.');
        setIsSubmitting(false);
        return;
      }

      const { data: subData, error } = await supabase.from('client_subscriptions').insert({
        lead_id: selectedLead.id,
        plan_id: plan.id,
        barbershop_id: barbershopId,
        status: 'active',
        credits_remaining: plan.credits_per_month,
        started_at: startDate.toISOString(),
        expires_at: expiresAt.toISOString(),
        next_billing_date: nextBilling.toISOString(),
        billing_interval: plan.billing_interval,
        auto_renew: plan.auto_renew,
      }).select('id').single();

      if (error) throw error;

      // Verificar se já existe cobrança pendente na mesma data antes de inserir
      const dueDateStr = startDate.toISOString().split('T')[0];
      const { data: existingPayment } = await supabase
        .from('subscription_payments')
        .select('id')
        .eq('subscription_id', subData.id)
        .eq('due_date', dueDateStr)
        .maybeSingle();

      if (!existingPayment) {
        await supabase.from('subscription_payments').insert({
          subscription_id: subData.id,
          barbershop_id: barbershopId,
          amount: plan.price,
          due_date: dueDateStr,
          payment_method: plan.billing_method || 'pix',
          status: 'pending',
        });
      }

      // Create portal access if requested
      if (createAccess && accessEmail.trim() && accessPassword) {
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session?.session?.access_token;

        const { data: accessResult, error: accessError } = await supabase.functions.invoke('create-client-account', {
          body: {
            email: accessEmail.trim(),
            password: accessPassword,
            full_name: selectedLead.full_name,
            barbershop_id: barbershopId,
            lead_id: selectedLead.id,
            subscription_id: subData.id,
          },
        });

        if (accessError || accessResult?.error) {
          const msg = accessResult?.error || accessError?.message || 'Erro ao criar acesso';
          toast.warning(`Assinatura criada, mas houve erro no acesso: ${msg}`);
        } else {
          toast.success(`Assinatura criada! Acesso ao portal gerado para ${accessEmail}.`);
        }
      } else {
        toast.success(`Assinatura criada para ${selectedLead.full_name}!`);
      }

      onSuccess();
      onOpenChange(false);

      // Fire-and-forget welcome email
      supabase.functions.invoke('send-subscription-email', {
        body: { type: 'welcome', subscription_id: subData.id },
      }).catch(console.error);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = activePlans.find(p => p.id === selectedPlanId);

  const stepTitle = {
    'lead': 'Selecione o cliente',
    'new-lead': 'Cadastrar novo cliente',
    'plan': `Plano para ${selectedLead?.full_name}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nova Assinatura Manual
          </DialogTitle>
          <DialogDescription>{stepTitle[step]}</DialogDescription>
        </DialogHeader>

        {step === 'lead' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[260px]">
              <div className="space-y-1">
                {loadingLeads && <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>}
                {!loadingLeads && leads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
                )}
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => selectLead(lead)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {lead.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep('new-lead')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar novo cliente
            </Button>
          </div>
        )}

        {step === 'new-lead' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('lead')} className="text-xs">
              ← Voltar à busca
            </Button>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Nome completo *</Label>
                <Input
                  id="new-name"
                  placeholder="Ex: João Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-phone">Telefone *</Label>
                <Input
                  id="new-phone"
                  placeholder="(11) 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email (opcional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateLead}
              disabled={!newName.trim() || !newPhone.trim() || creatingLead}
            >
              {creatingLead ? 'Cadastrando...' : 'Cadastrar e continuar'}
            </Button>
          </div>
        )}

        {step === 'plan' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('lead')} className="text-xs">
              ← Trocar cliente
            </Button>

            {activePlans.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum plano ativo disponível.</p>
            ) : (
              <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId} className="space-y-2">
                {activePlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={cn("p-3 cursor-pointer transition-all hover:border-primary",
                      selectedPlanId === plan.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={plan.id} id={`add-${plan.id}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm truncate">{plan.name}</span>
                          <Badge variant="secondary" className="font-bold shrink-0">
                            R$ {Number(plan.price).toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {plan.credits_per_month} créditos
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarLucide className="h-3 w-3" />
                            {plan.billing_interval === 'weekly' ? 'Semanal' : plan.billing_interval === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </RadioGroup>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Use data passada para migrar assinantes existentes.
              </p>
            </div>

            {/* Portal Access Section */}
            <Separator />
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCreateAccess(!createAccess)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                  createAccess
                    ? "border-primary bg-primary/5"
                    : "border-dashed border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  createAccess ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {createAccess ? 'Acesso ao portal ativado' : 'Criar acesso ao portal do cliente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {createAccess
                      ? 'O cliente poderá acessar com email e senha'
                      : 'Defina email e senha para acesso imediato sem email'}
                  </p>
                </div>
              </button>

              {createAccess && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="access-email">Email de acesso</Label>
                    <Input
                      id="access-email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="access-password">Senha padrão</Label>
                    <div className="relative">
                      <Input
                        id="access-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={accessPassword}
                        onChange={(e) => setAccessPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="access-password-confirm">Confirmar senha</Label>
                    <Input
                      id="access-password-confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={accessPasswordConfirm}
                      onChange={(e) => setAccessPasswordConfirm(e.target.value)}
                    />
                    {accessPasswordConfirm && accessPassword !== accessPasswordConfirm && (
                      <p className="text-xs text-destructive">As senhas não coincidem</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedPlan && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total:</p>
                    <p className="text-xl font-bold text-primary">R$ {Number(selectedPlan.price).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Créditos:</p>
                    <p className="text-lg font-semibold">{selectedPlan.credits_per_month}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          {step === 'plan' && (
            <Button onClick={handleConfirm} disabled={!selectedPlanId || isSubmitting}>
              {isSubmitting ? 'Processando...' : 'Confirmar Assinatura'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
