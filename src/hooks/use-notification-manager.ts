
"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { getMessaging, getToken } from "firebase/messaging";
import { messaging } from '@/lib/firebase';
import { useToast } from './use-toast';

export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();

    const registerNative = useCallback(async () => {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            await Toast.show({
                text: 'Permissão de notificação não concedida.',
            });
            return;
        }

        await PushNotifications.register();

        // On success, we should be able to receive notifications
        await PushNotifications.addListener('registration',
            (token) => {
                console.info('Registration token: ', token.value);
                // TODO: Enviar token para o seu servidor
            }
        );

        // Some issue with our setup and push will not work
        await PushNotifications.addListener('registrationError',
            (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            }
        );

        // Show us the notification payload if the app is open on our device
        await PushNotifications.addListener('pushNotificationReceived',
            (notification) => {
                console.log('Push received: ' + JSON.stringify(notification));
                 uiToast({
                    title: notification.title || "Nova Notificação",
                    description: notification.body || "",
                });
            }
        );

    }, [uiToast]);

    const registerWeb = useCallback(async () => {
        if (!messaging) {
            console.warn("Firebase Messaging não está disponível.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                console.log("Permissão para notificação concedida.");

                const vapidKey = "BGh5wCFGkMwqR8KCT8H9rFj_gS6fF2y5P2w3I8h4k9j8VzJ7l5nZ5wA9mQ4wS8gJ3sY7R5cK2bZ4fE6vX8cW3yE";
                const fcmToken = await getToken(messaging, { vapidKey });

                if (fcmToken) {
                    console.log("FCM Token:", fcmToken);
                    // TODO: Enviar este token para o seu servidor para que você possa enviar notificações.
                } else {
                    console.log("Não foi possível obter o token de notificação.");
                }
            } else {
                console.warn("Permissão para notificação não concedida.");
                 await Toast.show({
                    text: 'Permissão de notificação não concedida.',
                });
            }
        } catch (error) {
            console.error("Erro ao registrar notificações web:", error);
        }
    }, []);

    const init = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            registerNative();
        } else {
            registerWeb();
        }
    }, [registerNative, registerWeb]);

    return { init };
};
