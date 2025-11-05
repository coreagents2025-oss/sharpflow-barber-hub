import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { Message } from '@/pages/Messages';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isSent = message.message_type === 'sent';

  const getStatusIcon = () => {
    if (!isSent) return null;

    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="h-3 w-3" />;
      case 'failed':
        return <span className="text-destructive text-xs">✕</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isSent
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        
        {message.media_url && (
          <img
            src={message.media_url}
            alt="Mídia"
            className="mt-2 rounded max-w-full"
          />
        )}
        
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <span>{format(new Date(message.created_at), 'HH:mm')}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};