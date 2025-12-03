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

                const vapidKey = "BGgAaOC-KPGKCA0baZggbWM9qWrGyNw4JGyECyAVG0B3Y8F7KDbMEVX0JVh3EyqOj5SkS0ozHLrmWmzr8CsJvOB";
                
                try {
                    const fcmToken = await getToken(messaging, { vapidKey });

                    if (fcmToken) {
                        console.log("FCM Token:", fcmToken);
                        // TODO: Enviar este token para o seu servidor para que você possa enviar notificações.
                    } else {
                        console.log("Não foi possível obter o token de notificação.");
                    }
                } catch (error) {
                    console.error("Erro ao obter o token FCM:", error);
                     uiToast({
                        variant: "destructive",
                        title: "Falha ao registrar notificações",
                        description: "Não foi possível obter o token para notificações. Verifique se a API Firebase Cloud Messaging está ativada no seu projeto Google Cloud.",
                    });
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
    }, [uiToast]);

    const init = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            registerNative();
        } else {
            registerWeb();
        }
    }, [registerNative, registerWeb]);

    return { init };
};
