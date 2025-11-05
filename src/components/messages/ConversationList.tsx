import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '@/pages/Messages';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'unread' | 'archived';
  onFilterChange: (status: 'all' | 'unread' | 'archived') => void;
}

export const ConversationList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  loading,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
}: ConversationListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-2xl font-bold mb-4">Mensagens</h2>
        
        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros */}
        <Select value={filterStatus} onValueChange={(value: any) => onFilterChange(value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="archived">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground">
              As mensagens dos clientes aparecerão aqui
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b border-border ${
                selectedConversation?.id === conversation.id ? 'bg-accent/30' : ''
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(conversation.client_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm truncate">
                    {conversation.client_name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message || 'Sem mensagens'}
                  </p>
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="ml-2 min-w-[20px] h-5 rounded-full">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  {conversation.client_phone}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};