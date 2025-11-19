import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

interface LeadTag {
  id: string;
  tag: string;
  created_at: string;
}

const SUGGESTED_TAGS = [
  'VIP',
  'Fidelizado',
  'Primeira Visita',
  'Inadimplente',
  'Potencial Alto',
  'Retorno',
  'Indicação',
  'Reclamação',
];

export function ManageTagsDialog({ open, onOpenChange, leadId, leadName }: ManageTagsDialogProps) {
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open, leadId]);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('lead_tags')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTags(data);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!tag.trim()) {
      toast.error('Digite uma tag válida');
      return;
    }

    if (tag.length > 50) {
      toast.error('Tag muito longa (máx 50 caracteres)');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('lead_tags')
      .insert({
        lead_id: leadId,
        tag: tag.trim(),
      });

    setIsLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Esta tag já existe para este lead');
      } else {
        toast.error('Erro ao adicionar tag');
      }
      return;
    }

    toast.success('Tag adicionada');
    setNewTag('');
    fetchTags();
  };

  const handleRemoveTag = async (tagId: string) => {
    setIsLoading(true);

    const { error } = await supabase
      .from('lead_tags')
      .delete()
      .eq('id', tagId);

    setIsLoading(false);

    if (error) {
      toast.error('Erro ao remover tag');
      return;
    }

    toast.success('Tag removida');
    fetchTags();
  };

  const handleSuggestedTag = (suggestedTag: string) => {
    const tagExists = tags.some(t => t.tag.toLowerCase() === suggestedTag.toLowerCase());
    if (!tagExists) {
      handleAddTag(suggestedTag);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Gerenciar Tags
          </DialogTitle>
          <DialogDescription>
            Organize e categorize <strong>{leadName}</strong> com tags personalizadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input para adicionar nova tag */}
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(newTag);
                }
              }}
              maxLength={50}
              disabled={isLoading}
            />
            <Button
              onClick={() => handleAddTag(newTag)}
              disabled={!newTag.trim() || isLoading}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Tags atuais */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tags Atuais ({tags.length})</h4>
            <ScrollArea className="h-[100px]">
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tag adicionada</p>
                ) : (
                  tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                      {tag.tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveTag(tag.id)}
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Tags sugeridas */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tags Sugeridas</h4>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((suggestedTag) => {
                const alreadyAdded = tags.some(
                  t => t.tag.toLowerCase() === suggestedTag.toLowerCase()
                );
                return (
                  <Badge
                    key={suggestedTag}
                    variant={alreadyAdded ? "outline" : "default"}
                    className={`cursor-pointer ${
                      alreadyAdded ? 'opacity-50' : 'hover:bg-primary/80'
                    }`}
                    onClick={() => !alreadyAdded && handleSuggestedTag(suggestedTag)}
                  >
                    {suggestedTag}
                    {alreadyAdded && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
