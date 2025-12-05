"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { getMessaging, getToken } from "firebase/messaging";
import { db, messaging } from '@/lib/firebase';
import { useToast } from './use-toast';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Esta função agora está fora do hook para não depender do contexto do React
const saveTokenToDb = async (user: User, fcmToken: string) => {
    if (!user) {
        console.warn("Usuário não autenticado, não é possível salvar o token.");
        return;
    }

    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(fcmToken)
        });
        console.log("Token FCM salvo no Firestore com sucesso via updateDoc.");
    } catch (error) {
        console.error("Erro ao tentar 'updateDoc' para salvar token: ", error);
        // Fallback: Se o documento não existe, tenta criá-lo.
        if ((error as any).code === 'not-found' || (error as any).message.includes('No document to update')) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, { fcmTokens: [fcmToken] }, { merge: true });
                console.log("Documento de usuário criado e token FCM salvo via setDoc.");
            } catch (e) {
                console.error("Erro ao tentar 'setDoc' para salvar token: ", e);
            }
        }
    }
};


export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();

    const registerNative = useCallback(async (user: User) => {
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

        PushNotifications.addListener('registration',
            (token) => {
                console.info('Registration token: ', token.value);
                saveTokenToDb(user, token.value);
            }
        );

        PushNotifications.addListener('registrationError',
            (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            }
        );

        PushNotifications.addListener('pushNotificationReceived',
            (notification) => {
                console.log('Push received: ' + JSON.stringify(notification));
                 uiToast({
                    title: notification.title || "Nova Notificação",
                    description: notification.body || "",
                });
            }
        );

    }, [uiToast]);

    const registerWeb = useCallback(async (user: User) => {
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
                        await saveTokenToDb(user, fcmToken);
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

    const init = useCallback((user: User) => {
        if (Capacitor.isNativePlatform()) {
            registerNative(user);
        } else {
            registerWeb(user);
        }
    }, [registerNative, registerWeb]);

    return { init };
};
