/**
 * @fileOverview Flow to send notifications when a shopping list is updated.
 *
 * This flow is triggered by an update to a document in the 'shoppingLists'
 * collection in Firestore. It compares the old and new list of items,
 * identifies the newly added item, and sends a push notification to the
 * owner of the list.
 */

import { ai } from '@/ai/genkit';
import { onUpdate } from 'genkit/firebase';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { admin } from '@/lib/firebaseAdmin';
import { defineFlow } from 'genkit';

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('notify-on-update.ts: Firebase Admin SDK initialized for local development.');
      } catch (e) {
         console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
      }
    } else {
        admin.initializeApp();
        console.log('notify-on-update.ts: Firebase Admin SDK initialized for production.');
    }
}

const db = getFirestore();
const fcm = getMessaging();

interface ShoppingListItem {
  id: string;
  name: string;
  // Potentially other fields like createdAt
}

interface ShoppingList {
  userId: string;
  items: ShoppingListItem[];
}

export const shoppingListUpdateFlow = defineFlow(
  {
    name: 'onShoppingListUpdate',
    trigger: {
      connector: 'firebase',
      type: 'document',
      config: {
        collection: 'shoppingLists',
        // Use a wildcard to trigger for any document in the collection.
        document: '{listId}', 
      },
    },
  },
  async (change) => {
    console.log('Shopping list updated, flow triggered.');

    const beforeData = change.before.data() as ShoppingList | undefined;
    const afterData = change.after.data() as ShoppingList | undefined;

    if (!beforeData || !afterData) {
      console.log('Either before or after data is missing. Exiting flow.');
      return;
    }

    // Basic check: if the item count hasn't increased, do nothing.
    if (afterData.items.length <= beforeData.items.length) {
      console.log('Item count did not increase. No new item detected. Exiting.');
      return;
    }

    const beforeIds = new Set(beforeData.items.map((item) => item.id));
    const newItem = afterData.items.find((item) => !beforeIds.has(item.id));

    if (!newItem) {
      console.log('Could not determine the new item. Exiting.');
      return;
    }

    const userId = afterData.userId;
    console.log(`New item "${newItem.name}" added to list for user ${userId}.`);

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(`User document for an ID ${userId} does not exist. Cannot send notification.`);
      return;
    }

    const tokens = userDoc.data()?.fcmTokens;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens. Cannot send notification.`);
      return;
    }
    
    const payload = {
        notification: {
            title: 'Novo Item na Lista!',
            body: `O item "${newItem.name}" foi adicionado à sua lista.`,
            image: '/images/placeholder-icon.png?v=2'
        },
        webpush: {
            fcm_options: {
                link: '/',
            }
        }
    };
    
    console.log(`Sending notification to ${tokens.length} token(s) for user ${userId}.`);
    const response = await fcm.sendToDevice(tokens, payload);
    
    const tokensToRemove: string[] = [];
    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.error(`Failure sending notification to token ${tokens[index]}:`, error);
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[index]);
            }
        }
    });

    if (tokensToRemove.length > 0) {
      console.log(`Removing ${tokensToRemove.length} invalid tokens.`);
      await userDocRef.update({
        fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
      });
    }

    console.log(`Successfully sent ${response.successCount} notifications.`);
  }
);
