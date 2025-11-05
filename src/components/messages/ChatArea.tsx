import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Phone } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageBubble } from './MessageBubble';
import { Conversation, Message } from '@/pages/Messages';
import { useSendMessage } from '@/hooks/useSendMessage';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  barbershopId: string | null;
}

export const ChatArea = ({ conversation, messages, barbershopId }: ChatAreaProps) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, loading } = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !conversation || !barbershopId) return;

    await sendMessage(conversation.id, messageText, barbershopId, conversation.client_phone);
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Phone className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
        <p className="text-muted-foreground">
          Escolha uma conversa da lista para começar a conversar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(conversation.client_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{conversation.client_name}</h3>
          <p className="text-sm text-muted-foreground">{conversation.client_phone}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          asChild
        >
          <a
            href={`https://wa.me/${conversation.client_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Textarea
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="min-h-[60px] max-h-[120px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};