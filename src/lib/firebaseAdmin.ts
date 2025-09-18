
import admin from 'firebase-admin';

// A inicialização agora é feita sob demanda dentro das funções que precisam do Admin SDK (ex: fcm.ts)
// para garantir que o ambiente (local ou App Hosting) forneça as credenciais corretas.
// Este arquivo apenas exporta a instância principal do 'admin'.

export { admin };
