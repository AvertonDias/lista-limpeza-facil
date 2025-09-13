import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez, garantindo que não haja múltiplas instâncias.
if (!admin.apps.length) {
  try {
    // A chave da conta de serviço é necessária para autenticar o Admin SDK.
    // O arquivo `serviceAccountKey.json` deve estar na raiz do projeto.
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error(
      'Falha ao inicializar o Firebase Admin. Verifique se o arquivo `serviceAccountKey.json` está na raiz do projeto.',
      error
    );
  }
}

export { admin };
