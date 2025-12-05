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

export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();

    const registerNative = useCallback(async (user: User) => {
        if (!user) return;
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            await Toast.show({ text: 'Permissão de notificação não concedida.' });
            return;
        }

        await PushNotifications.register();

        const saveToken = async (fcmToken: string) => {
            const userDocRef = doc(db, "users", user.uid);
            try {
                await updateDoc(userDocRef, { fcmTokens: arrayUnion(fcmToken) });
            } catch (error: any) {
                if (error.code === 'not-found') {
                    await setDoc(userDocRef, { fcmTokens: [fcmToken] }, { merge: true });
                } else {
                    console.error("Erro ao salvar token nativo:", error);
                }
            }
        };

        PushNotifications.addListener('registration', (token) => {
            console.info('Registration token: ', token.value);
            saveToken(token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            uiToast({
                title: notification.title || "Nova Notificação",
                description: notification.body || "",
            });
        });

    }, [uiToast]);

    const registerWeb = useCallback(async (user: User) => {
        if (!user || !messaging) {
            console.warn("Usuário ou Firebase Messaging não está disponível.");
            return;
        }
        
        const saveTokenToDb = async (fcmToken: string) => {
            const userDocRef = doc(db, "users", user.uid);
            try {
                // Tenta atualizar o documento existente
                await updateDoc(userDocRef, {
                    fcmTokens: arrayUnion(fcmToken)
                });
                console.log("Token FCM salvo no Firestore com sucesso via updateDoc.");
            } catch (error: any) {
                // Se o documento não existe, cria um novo
                if (error.code === 'not-found' || (error.message && error.message.includes('No document to update'))) {
                    try {
                        await setDoc(userDocRef, { fcmTokens: [fcmToken] }, { merge: true });
                        console.log("Documento de usuário criado e token FCM salvo via setDoc.");
                    } catch (e) {
                        console.error("Erro ao tentar 'setDoc' para salvar token: ", e);
                        uiToast({
                            variant: "destructive",
                            title: "Erro Crítico",
                            description: "Não foi possível criar o registro de usuário para salvar o token de notificação.",
                        });
                    }
                } else {
                     console.error("Erro ao tentar 'updateDoc' para salvar token: ", error);
                     uiToast({
                        variant: "destructive",
                        title: "Erro ao Salvar Token",
                        description: `Ocorreu um erro inesperado ao salvar o token de notificação: ${error.message}`,
                    });
                }
            }
        };


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
                await Toast.show({ text: 'Permissão de notificação não concedida.' });
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
