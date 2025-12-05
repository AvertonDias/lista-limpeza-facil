"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { getMessaging, getToken } from "firebase/messaging";
import { db, messaging } from '@/lib/firebase';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';


export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();
    const { user } = useAuth();

    const saveTokenToDb = useCallback(async (fcmToken: string) => {
        if (!user) {
            console.warn("Usuário não autenticado, não é possível salvar o token.");
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            // Usamos setDoc com merge para garantir que o documento exista,
            // e arrayUnion para adicionar o token sem duplicá-lo.
            await setDoc(userDocRef, { 
                fcmTokens: arrayUnion(fcmToken) 
            }, { merge: true });
            console.log("Token FCM salvo no Firestore com sucesso.");

        } catch (error) {
            console.error("Erro ao salvar token no Firestore: ", error);
        }

    }, [user]);

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

        await PushNotifications.addListener('registration',
            (token) => {
                console.info('Registration token: ', token.value);
                saveTokenToDb(token.value);
            }
        );

        await PushNotifications.addListener('registrationError',
            (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            }
        );

        await PushNotifications.addListener('pushNotificationReceived',
            (notification) => {
                console.log('Push received: ' + JSON.stringify(notification));
                 uiToast({
                    title: notification.title || "Nova Notificação",
                    description: notification.body || "",
                });
            }
        );

    }, [uiToast, saveTokenToDb]);

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
                        await saveTokenToDb(fcmToken);
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
    }, [uiToast, saveTokenToDb]);

    const init = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            registerNative();
        } else {
            registerWeb();
        }
    }, [registerNative, registerWeb]);

    return { init };
};
