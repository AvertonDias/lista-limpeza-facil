
import admin from 'firebase-admin';

// A inicialização agora é feita sob demanda dentro das funções que precisam do Admin SDK (ex: fcm.ts)
// para garantir que as variáveis de ambiente estejam carregadas.
// Este arquivo apenas exporta a instância principal do 'admin'.

export { admin };
