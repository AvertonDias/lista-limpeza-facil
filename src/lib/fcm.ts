'use server';

import { doc, getDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This is a server-side function to send a notification.
// We are using the legacy HTTP API for simplicity.
// For a production application, you should use the a server-side SDK (e.g., Firebase Admin SDK)
// and the new HTTP v1 API.

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
// IMPORTANT: This is a server key. In a real production app, this should be stored securely
// in a secret manager, not in the source code.
const FCM_SERVER_KEY = 'AAAA_s3mXlM:APA91bF9R1gYV_zK8w7B5J7s2Z_4hQ6K2h-Y6e7Z_3J_rJ5c5d0jF1o3X8zY6yX6f0z5k_tH7j7r_X1i9w_Z5f3k_2w_x_9c_V0e_B7n_N6o_C1p_T4t_R_S_Q_W_E_Y_U';

interface UserData {
    fcmTokens?: string[];
}

export async function sendNotification(userId: string, title: string, body: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data() as UserData;
    const tokens = userData.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens for user:', userId);
      return { success: false, error: 'No tokens found' };
    }
    
    const message = {
      registration_ids: tokens, // Use registration_ids for multiple tokens
      notification: {
        title,
        body,
        icon: '/images/placeholder-icon.png?v=2',
      },
    };

    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log('Successfully sent message:', responseData);
      // Clean up invalid tokens
      if (responseData.results) {
        const tokensToRemove: string[] = [];
        responseData.results.forEach((result: any, index: number) => {
            if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
                tokensToRemove.push(tokens[index]);
            }
        });
        if (tokensToRemove.length > 0) {
            console.log("Removing invalid tokens:", tokensToRemove);
            // This is a fire-and-forget operation, no need to await
            setDoc(userDocRef, { fcmTokens: arrayRemove(...tokensToRemove) }, { merge: true });
        }
      }
      return { success: true, response: responseData };
    } else {
      console.error('Error sending message:', responseData);
      // Clean up invalid tokens
      if (responseData.results) {
        const tokensToRemove: string[] = [];
        responseData.results.forEach((result: any, index: number) => {
            if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
                tokensToRemove.push(tokens[index]);
            }
        });
        if (tokensToRemove.length > 0) {
            console.log("Removing invalid tokens:", tokensToRemove);
            // This is a fire-and-forget operation, no need to await
            setDoc(userDocRef, { fcmTokens: arrayRemove(...tokensToRemove) }, { merge: true });
        }
      }
      return { success: false, error: responseData };
    }

  } catch (error) {
    console.error('Error sending FCM message:', error);
    return { success: false, error: (error as Error).message };
  }
}
