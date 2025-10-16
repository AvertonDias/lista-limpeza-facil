'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onFeedbackSent: (
    templateId: string,
    templateParams: Record<string, unknown>
  ) => Promise<void>;
}

export default function FeedbackModal({
  open,
  onClose,
  userId,
  onFeedbackSent,
}: FeedbackModalProps) {
  const { toast } = useToast();
  const [type, setType] = useState<'suggestion' | 'doubt'>('doubt');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Por favor, escreva sua mensagem.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const feedbackCollection = collection(db, 'feedback');
      await addDoc(feedbackCollection, {
        listOwnerId: userId,
        type,
        name: name.trim() || 'Anônimo',
        text: text.trim(),
        createdAt: serverTimestamp(),
        status: 'new',
      });

      // Notify owner
      await onFeedbackSent('template_k5f2kvk', {
        feedback_type: type === 'doubt' ? 'Dúvida' : 'Sugestão',
        sender_name: name.trim() || 'Anônimo',
        feedback_text: text.trim(),
      });

      toast({
        title: 'Mensagem Enviada!',
        description: 'Obrigado pelo seu feedback!',
      });

      // Reset form and close modal
      setName('');
      setText('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar',
        description: 'Não foi possível enviar sua mensagem. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              Enviar Dúvida ou Sugestão
            </DialogTitle>
            <DialogDescription>
              Sua mensagem ajuda a manter tudo em ordem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Mensagem</Label>
              <Select
                value={type}
                onValueChange={(value: 'suggestion' | 'doubt') => setType(value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doubt">Tenho uma Dúvida</SelectItem>
                  <SelectItem value="suggestion">Tenho uma Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Seu Nome (Opcional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como podemos te chamar?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="text">Sua Mensagem</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva aqui sua dúvida ou sugestão..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
