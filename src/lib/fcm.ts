'use server';

import { doc, getDoc, setDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from 'firebase-admin';

// Placeholder for the service account key file
// IMPORTANT: Create a `serviceAccountKey.json` file in the root of your project
// with the credentials from your Firebase project settings.
let serviceAccount: admin.ServiceAccount;
try {
    serviceAccount = require('../../../serviceAccountKey.json');
} catch (e) {
    console.error("CRITICAL: `serviceAccountKey.json` not found. Push notifications will fail. Please download it from your Firebase project settings and place it in the project's root directory.");
    serviceAccount = {};
}


// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch(e) {
    console.error("Firebase Admin initialization failed:", e);
  }
}


interface UserData {
    fcmTokens?: string[];
    displayName?: string;
    email?: string;
}

export async function sendNotification(userId: string, title: string, body: string) {
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK is not initialized. Cannot send notifications.");
    return { success: false, error: "Admin SDK not initialized" };
  }
  
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
    
    const tokensToRemove: string[] = [];
    const successfulSends: string[] = [];
    
    const sendPromises = tokens.map(async (token) => {
        const message: admin.messaging.Message = {
            token: token,
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    icon: '/images/placeholder-icon.png?v=2',
                },
                fcm_options: {
                    link: `/`, // Link to the main page on click
                }
            }
        };
        
        try {
            const response = await admin.messaging().send(message);
            successfulSends.push(response);
        } catch (error: any) {
             console.error('Error sending notification to a token:', error.code);
             // Check for errors indicating an invalid or unregistered token
             if (
                error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered'
             ) {
                tokensToRemove.push(token);
             }
        }
    });

    await Promise.all(sendPromises);

    // Clean up invalid tokens from Firestore
    if (tokensToRemove.length > 0) {
        console.log("Removing invalid tokens:", tokensToRemove);
        await setDoc(userDocRef, { fcmTokens: arrayRemove(...tokensToRemove) }, { merge: true });
    }

    if (successfulSends.length > 0) {
         console.log(`Successfully sent ${successfulSends.length} messages.`);
         return { success: true, count: successfulSends.length };
    } else {
         return { success: false, error: "No messages could be sent." };
    }
    
  } catch (error) {
    console.error('Error sending FCM message:', error);
    return { success: false, error: (error as Error).message };
  }
}
