import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error(
      "Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente.",
      error
    );
  }
}

export { admin };
