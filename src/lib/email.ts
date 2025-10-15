"use client";

import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_1d5z8n9';
const PUBLIC_KEY = 'Yj5CBlcpbHrHQeYik';

// Inicializa o EmailJS uma vez.
emailjs.init({ publicKey: PUBLIC_KEY });

/**
 * Envia um e-mail usando EmailJS com um template e parâmetros dinâmicos.
 * @param templateId - O ID do template a ser usado.
 * @param templateParams - Um objeto contendo as variáveis para o template.
 */
export const sendEmail = (templateId: string, templateParams: Record<string, unknown>) => {
  return emailjs.send(SERVICE_ID, templateId, templateParams);
};
