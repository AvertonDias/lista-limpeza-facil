"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { getToken } from "firebase/messaging";
import { db, messaging } from '@/lib/firebase';
import { useToast } from './use-toast';
import { doc, arrayUnion, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();

    const saveTokenToFirestore = async (uid: string, token: string) => {
        if (!uid || !token) return;

        try {
            const userDocRef = doc(db, "users", uid);
            await setDoc(userDocRef, { 
                fcmTokens: arrayUnion(token),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            console.log("Token FCM salvo/atualizado com sucesso no Firestore.");
        } catch (error: any) {
            console.error("Erro ao salvar token no Firestore:", error);
            uiToast({
                variant: "destructive",
                title: "Erro de Banco de Dados",
                description: "Não foi possível vincular o dispositivo ao seu usuário.",
            });
            throw error; // Re-throw to be caught by the caller
        }
    };

    const registerNative = useCallback(async (user: User) => {
        if (!user) return Promise.reject("Usuário não encontrado.");

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', (token) => {
            console.info('Native Registration token: ', token.value);
            saveTokenToFirestore(user.uid, token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on native registration: ' + JSON.stringify(error));
            throw new Error('Falha no registro nativo.');
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            uiToast({
                title: notification.title || "Nova Notificação",
                description: notification.body || "",
            });
        });

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
             await Toast.show({ text: 'Permissão de notificação negada.' });
             throw new Error('Permissão negada.');
        }

        await PushNotifications.register();
    }, [uiToast]);

    const registerWeb = useCallback(async (user: User) => {
        if (!user || !messaging) {
            const errorMsg = "Usuário ou Firebase Messaging não está disponível.";
            console.warn(errorMsg);
            return Promise.reject(errorMsg);
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === "granted") {
                console.log("Permissão Web concedida.");
                
                // When the service worker is properly configured via next-pwa,
                // we don't need to pass the vapidKey explicitly.
                const fcmToken = await getToken(messaging);

                if (fcmToken) {
                    console.log("Token Web gerado:", fcmToken);
                    await saveTokenToFirestore(user.uid, fcmToken);
                } else {
                     throw new Error("Nenhum token de registro disponível. Solicite permissão para gerar um.");
                }

            } else {
                console.warn("Permissão de notificação Web negada.");
                throw new Error("Permissão de notificação Web negada.");
            }
        } catch (error) {
            console.error("Erro ao registrar notificações Web:", error);
            throw error; // Re-throw to be caught by caller
        }
    }, [uiToast]);

    const init = useCallback((user: User): Promise<void> => {
        if (Capacitor.isNativePlatform()) {
            return registerNative(user);
        } else {
            return registerWeb(user);
        }
    }, [registerNative, registerWeb]);

    return { init };
};
