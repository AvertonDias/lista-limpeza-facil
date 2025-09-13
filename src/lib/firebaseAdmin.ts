'use server';
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez, garantindo que não haja múltiplas instâncias.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin SDK:', error);
  }
}

export { admin };
