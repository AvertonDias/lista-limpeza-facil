'use server';
import admin from 'firebase-admin';
import { doc, getDoc, setDoc, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function sendNotification(userId: string, title: string, body: string) {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) return { success: false, error: 'Usuário não encontrado' };
  const tokens = userDoc.data()?.fcmTokens || [];

  const invalidTokens: string[] = [];
  const successes: string[] = [];

  await Promise.all(tokens.map(async (token: string) => {
    try {
      const msg: admin.messaging.Message = {
        token,
        notification: { title, body },
        webpush: {
          notification: { icon: '/images/placeholder-icon.png' },
          fcmOptions: { link: '/' }
        }
      };
      const res = await admin.messaging().send(msg);
      successes.push(res);
    } catch (e: any) {
      if (['messaging/invalid-registration-token','messaging/registration-token-not-registered'].includes(e.code)) {
        invalidTokens.push(token);
      }
    }
  }));

  if (invalidTokens.length > 0) {
    await setDoc(userDocRef, { fcmTokens: arrayRemove(...invalidTokens) }, { merge: true });
  }

  return { success: successes.length > 0, sent: successes.length, removed: invalidTokens.length };
}
