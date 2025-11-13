import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeadStatusBadge } from './LeadStatusBadge';
import { Lead } from '@/hooks/useLeads';
import { 
  Calendar, 
  DollarSign, 
  MessageCircle, 
  StickyNote, 
  Tag,
  Archive,
  Phone,
  Mail,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddNoteDialog } from './AddNoteDialog';
import { CreateAppointmentDialog } from './CreateAppointmentDialog';
import { useAuth } from '@/hooks/useAuth';

interface LeadDetailsPanelProps {
  lead: Lead | null;
}

export function LeadDetailsPanel({ lead }: LeadDetailsPanelProps) {
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const { user } = useAuth();

  // Função para normalizar telefone para WhatsApp Web
  const normalizePhoneForWhatsApp = (phone: string): string => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se começar com 55 (DDI Brasil), retorna direto
    if (cleanPhone.startsWith('55')) {
      return cleanPhone;
    }
    
    // Se tem 11 dígitos (DDD + número), adiciona DDI 55
    if (cleanPhone.length === 11) {
      return `55${cleanPhone}`;
    }
    
    // Se tem 10 dígitos (DDD + número sem 9), adiciona DDI 55
    if (cleanPhone.length === 10) {
      return `55${cleanPhone}`;
    }
    
    // Retorna o número limpo como está
    return cleanPhone;
  };

  const getWhatsAppUrl = () => {
    if (!lead?.phone) return '#';

    const normalizedPhone = normalizePhoneForWhatsApp(lead.phone);
    
    // Mensagem padrão de confirmação
    const message = `Olá ${lead.full_name}! Seu agendamento foi confirmado, aguardamos sua presença.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Usar wa.me que é menos bloqueado
    return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
  };

  const handleCopyWhatsAppLink = async () => {
    if (!lead?.phone) {
      alert('⚠️ Este lead não possui um número de telefone cadastrado.');
      return;
    }

    const url = getWhatsAppUrl();
    
    try {
      await navigator.clipboard.writeText(url);
      alert('✅ Link do WhatsApp copiado! Cole no navegador para abrir.');
    } catch (error) {
      // Fallback se clipboard não funcionar
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Link do WhatsApp copiado! Cole no navegador para abrir.');
    }
  };

  if (!lead) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Selecione um lead para ver os detalhes</p>
        </CardContent>
      </Card>
    );
  }

  const initials = lead.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ticketMedio = lead.total_appointments > 0 
    ? lead.total_spent / lead.completed_appointments 
    : 0;

  const taxaComparecimento = lead.total_appointments > 0
    ? (lead.completed_appointments / lead.total_appointments) * 100
    : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Cabeçalho do Lead */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={lead.avatar_url} alt={lead.full_name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{lead.full_name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <LeadStatusBadge status={lead.status} />
              {lead.lifetime_value > 500 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">
                  Cliente Premium
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Métricas do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métricas do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Gasto</p>
                <p className="text-xl font-bold text-primary">
                  R$ {lead.total_spent.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
                <p className="text-xl font-bold">
                  R$ {ticketMedio.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completos</p>
                  <p className="font-semibold">{lead.completed_appointments}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cancelados</p>
                  <p className="font-semibold">{lead.cancelled_appointments}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Taxa de Comparecimento</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                    style={{ width: `${taxaComparecimento}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{taxaComparecimento.toFixed(0)}%</span>
              </div>
            </div>

            {lead.last_appointment_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Última Visita</p>
                <p className="text-sm font-medium">
                  {new Date(lead.last_appointment_date).toLocaleDateString('pt-BR')}
                  <span className="text-muted-foreground ml-2">
                    ({lead.days_since_last_visit} dias atrás)
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-6">
            <Button 
              variant="outline" 
              className="w-full justify-start touch-target" 
              size="sm"
              onClick={() => setIsNoteDialogOpen(true)}
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Adicionar Anotação
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start touch-target" 
              size="sm"
              onClick={() => setIsAppointmentDialogOpen(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Criar Agendamento
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                className="flex-1 justify-start touch-target" 
                size="sm"
                asChild
              >
                <a 
                  href={getWhatsAppUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!lead?.phone) {
                      e.preventDefault();
                      alert('⚠️ Este lead não possui um número de telefone cadastrado.');
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCopyWhatsAppLink}
                title="Copiar link do WhatsApp"
                className="touch-target"
              >
                📋
              </Button>
            </div>
            <Button variant="outline" className="w-full justify-start touch-target" size="sm">
              <Tag className="h-4 w-4 mr-2" />
              Gerenciar Tags
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive touch-target" size="sm">
              <Archive className="h-4 w-4 mr-2" />
              Arquivar Lead
            </Button>
          </CardContent>
        </Card>

        {/* Timeline (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              Histórico de agendamentos, pagamentos e notas será exibido aqui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddNoteDialog
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        leadId={lead.id}
        leadName={lead.full_name}
      />

      <CreateAppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        leadId={lead.id}
        leadName={lead.full_name}
        leadPhone={lead.phone}
        leadEmail={lead.email}
        barbershopId={user?.user_metadata?.barbershop_id || null}
      />
    </ScrollArea>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
