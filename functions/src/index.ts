
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const fcm = admin.messaging();

interface ShoppingListItem {
  id: string;
  name: string;
}

interface ShoppingList {
  userId: string;
  items: ShoppingListItem[];
}

interface Feedback {
    listOwnerId: string;
    type: 'suggestion' | 'doubt';
    text: string;
    name?: string;
}

// Function to send notifications and handle cleanup of invalid tokens
async function sendNotificationToUser(userId: string, title: string, body: string) {
    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        console.log(`User document ${userId} not found.`);
        return;
    }

    const tokens = userDoc.data()?.fcmTokens as string[] | undefined;
    if (!Array.isArray(tokens) || tokens.length === 0) {
        console.log(`No FCM tokens for user ${userId}.`);
        return;
    }

    const message = {
        tokens,
        notification: {
            title,
            body,
            // Using absolute URL as required by FCM
            image: "https://lista-limpeza-facil.vercel.app/images/placeholder-icon.png?v=2",
        },
        webpush: {
            fcmOptions: {
                link: "/",
            },
        },
    };

    const response = await fcm.sendEachForMulticast(message);

    const tokensToRemove: string[] = [];
    response.responses.forEach((res, index) => {
        if (!res.success && res.error) {
            console.error(`Failure sending notification to token at index ${index}:`, res.error);
            if (
                res.error.code === "messaging/invalid-argument" ||
                res.error.code === "messaging/registration-token-not-registered"
            ) {
                tokensToRemove.push(tokens[index]);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        console.log(`Removing ${tokensToRemove.length} invalid tokens.`);
        await userDocRef.update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        });
    }
}


export const onShoppingListUpdate = functions.firestore
    .document("shoppingLists/{listId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data() as ShoppingList | undefined;
        const afterData = change.after.data() as ShoppingList | undefined;

        if (!beforeData || !afterData) {
            console.log("Either before or after data is missing. Exiting.");
            return;
        }

        // If the item count hasn't increased, do nothing.
        if (afterData.items.length <= beforeData.items.length) {
            console.log("Item count did not increase. No new item detected.");
            return;
        }

        const beforeIds = new Set(beforeData.items.map((item) => item.id));
        const newItem = afterData.items.find((item) => !beforeIds.has(item.id));

        if (!newItem) {
            console.log("Could not determine the new item. Exiting.");
            return;
        }

        const userId = afterData.userId;
        const title = "Novo Item na Lista!";
        const body = `O item "${newItem.name}" foi adicionado à sua lista.`;

        await sendNotificationToUser(userId, title, body);
    });

export const onNewFeedback = functions.firestore
    .document("feedback/{feedbackId}")
    .onCreate(async (snapshot, context) => {
        const feedbackData = snapshot.data() as Feedback | undefined;

        if (!feedbackData) {
            console.log("Feedback data is missing. Exiting.");
            return;
        }

        const { listOwnerId, type, text, name } = feedbackData;
        
        let title = "Nova Mensagem Recebida";
        if (type === "suggestion") {
            title = "Nova Sugestão Recebida!";
        } else if (type === "doubt" && name) {
            title = `Nova Dúvida de ${name}`;
        }
        
        const body = text.substring(0, 100) + (text.length > 100 ? "..." : "");

        await sendNotificationToUser(listOwnerId, title, body);
    });
