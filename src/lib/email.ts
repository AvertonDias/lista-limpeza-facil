"use client";

import emailjs from '@emailjs/browser';
import { toast } from '@/hooks/use-toast';

// Essas chaves são públicas e seguras para serem expostas no lado do cliente.
const EMAILJS_SERVICE_ID = 'service_6yq8q5p'; 
const EMAILJS_TEMPLATE_ID = 'template_jw234gh';
const EMAILJS_PUBLIC_KEY = 'JdR2XKNICKcHc1jny';

interface EmailParams {
  to_email: string;
  to_name: string;
  from_name: string;
  subject: string;
  message: string;
}

/**
 * Envia um e-mail usando o serviço EmailJS.
 *
 * @param params Parâmetros do e-mail a ser enviado.
 */
export const sendEmail = (params: EmailParams) => {
  // Inicializa o EmailJS se ainda não tiver sido feito.
  // Isso é útil em ambientes Next.js para evitar inicializações múltiplas.
  if (typeof window !== 'undefined' && (emailjs as any).init) {
      (emailjs as any).init({
        publicKey: EMAILJS_PUBLIC_KEY,
      });
  }

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY)
    .then((result) => {
        console.log('EmailJS: E-mail enviado com sucesso!', result.text);
    }, (error) => {
        console.error('EmailJS: Falha ao enviar e-mail.', error.text);
        toast({
            variant: "destructive",
            title: "Erro de Notificação",
            description: "Não foi possível enviar a notificação por e-mail."
        });
    });
};
