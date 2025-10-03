/**
 * @fileOverview Flow to send notifications when new feedback is submitted.
 *
 * This flow is triggered by the creation of a new document in the 'feedback'
 * collection in Firestore. It sends a push notification to the owner of the list
 * that the feedback pertains to.
 */

import { defineFlow } from 'genkit';
import { onCreate } from 'genkit/firebase';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { admin } from '@/lib/firebaseAdmin';

// Ensure Firebase Admin SDK is initialized (idempotent)
if (!admin.apps.length) {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(
        'feedback-notification.ts: Firebase Admin SDK initialized for local development.'
      );
    } catch (e) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON', e);
    }
  } else {
    admin.initializeApp();
    console.log(
      'feedback-notification.ts: Firebase Admin SDK initialized for production.'
    );
  }
}

const db = getFirestore();
const fcm = getMessaging();

interface Feedback {
  listOwnerId: string;
  type: 'suggestion' | 'doubt';
  text: string;
  name?: string; // Present for 'doubt' type
}

export const feedbackNotificationFlow = defineFlow(
  {
    name: 'onNewFeedback',
    trigger: {
      connector: 'firebase',
      type: 'document',
      config: {
        collection: 'feedback',
        document: '{feedbackId}', // Wildcard to trigger for any new document
        event: 'create', // Explicitly trigger only on creation
      },
    },
  },
  async (event) => {
    console.log('New feedback document created, flow triggered.');

    const feedbackData = event.data.data() as Feedback | undefined;

    if (!feedbackData) {
      console.log('Feedback data is missing. Exiting flow.');
      return;
    }

    const { listOwnerId, type, text, name } = feedbackData;
    const userId = listOwnerId;

    console.log(`New feedback of type "${type}" for user ${userId}.`);

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(
        `User document for ID ${userId} does not exist. Cannot send notification.`
      );
      return;
    }

    const tokens = userDoc.data()?.fcmTokens;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log(
        `User ${userId} has no FCM tokens. Cannot send notification.`
      );
      return;
    }

    // Construct notification title and body
    let title = '';
    const body = text.substring(0, 100) + (text.length > 100 ? '...' : '');

    if (type === 'suggestion') {
      title = 'Nova Sugestão Recebida!';
    } else if (type === 'doubt' && name) {
      title = `Nova Dúvida de ${name}`;
    } else {
      title = 'Nova Mensagem Recebida';
    }

    const payload = {
      notification: {
        title,
        body,
        image: '/images/placeholder-icon.png?v=2',
      },
      webpush: {
        fcm_options: {
          link: '/',
        },
      },
    };

    console.log(
      `Sending feedback notification to ${tokens.length} token(s) for user ${userId}.`
    );
    const response = await fcm.sendToDevice(tokens, payload);

    const tokensToRemove: string[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error(
          `Failure sending notification to token ${tokens[index]}:`,
          error
        );
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
        fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    console.log(`Successfully sent ${response.successCount} notifications.`);
  }
);
