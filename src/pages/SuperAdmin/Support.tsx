import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useSupportTickets, useTicketMessages, useSendTicketMessage, useUpdateTicketStatus } from '@/hooks/useSuperAdminData';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  open: { label: 'Aberto', variant: 'destructive', icon: AlertCircle },
  in_progress: { label: 'Em Andamento', variant: 'default', icon: Clock },
  resolved: { label: 'Resolvido', variant: 'secondary', icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; variant: string }> = {
  low: { label: 'Baixa', variant: 'outline' },
  medium: { label: 'Média', variant: 'secondary' },
  high: { label: 'Alta', variant: 'default' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

export default function SuperAdminSupport() {
  const { user } = useAuth();
  const { data: tickets, isLoading } = useSupportTickets();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const { data: messages } = useTicketMessages(selectedTicketId);
  const sendMessage = useSendTicketMessage();
  const updateStatus = useUpdateTicketStatus();

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

  const filtered = (tickets ?? []).filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.barbershopName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicketId || !user?.id) return;
    sendMessage.mutate({ ticketId: selectedTicketId, content: newMessage, senderId: user.id });
    setNewMessage('');
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
          <p className="text-muted-foreground">Gerenciar tickets de suporte das barbearias</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
          {/* Ticket List */}
          <div className="space-y-3 overflow-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center text-muted-foreground p-4">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum ticket encontrado</p>
              </div>
            ) : (
              filtered.map(t => {
                const sc = statusConfig[t.status] || statusConfig.open;
                const pc = priorityConfig[t.priority] || priorityConfig.medium;
                return (
                  <Card
                    key={t.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedTicketId === t.id ? 'border-primary' : ''}`}
                    onClick={() => setSelectedTicketId(t.id)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm text-foreground line-clamp-1">{t.subject}</h3>
                        <Badge variant={sc.variant as any} className="text-xs ml-2 shrink-0">{sc.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.barbershopName}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant={pc.variant as any} className="text-xs">{pc.label}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'dd/MM HH:mm')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Ticket Detail & Chat */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{selectedTicket.barbershopName}</p>
                      {selectedTicket.description && (
                        <p className="text-sm text-muted-foreground mt-2">{selectedTicket.description}</p>
                      )}
                    </div>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={s => updateStatus.mutate({ ticketId: selectedTicket.id, status: s })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                  {(messages ?? []).map(m => (
                    <div key={m.id} className={`flex ${m.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        m.is_admin_reply
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        <p>{m.content}</p>
                        <span className="text-xs opacity-70 block mt-1">
                          {format(new Date(m.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(messages ?? []).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-border flex gap-2">
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Selecione um ticket para ver os detalhes</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
