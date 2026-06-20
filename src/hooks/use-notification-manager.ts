"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
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

            console.log("Token FCM salvo com sucesso.");
        } catch (error) {
            console.error("Erro ao salvar token no Firestore:", error);
            uiToast({
                variant: "destructive",
                title: "Erro de Conexão",
                description: "Não foi possível vincular as notificações ao seu usuário.",
            });
        }
    };

    const registerNative = useCallback(async (user: User) => {
        if (!user) return;

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', (token) => {
            saveTokenToFirestore(user.uid, token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on native registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
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
             throw new Error('Permissão de notificação negada.');
        }

        await PushNotifications.register();
    }, [uiToast]);

    const registerWeb = useCallback(async (user: User) => {
        if (!user || !messaging) return;

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === "granted") {
                const fcmToken = await getToken(messaging);
                if (fcmToken) {
                    await saveTokenToFirestore(user.uid, fcmToken);
                } else {
                     throw new Error("Falha ao gerar token web.");
                }
            } else {
                throw new Error("Permissão web negada.");
            }
        } catch (error) {
            console.error("Erro no registro Web:", error);
            throw error;
        }
    }, []);

    const init = useCallback((user: User): Promise<void> => {
        if (Capacitor.isNativePlatform()) {
            return registerNative(user);
        } else {
            return registerWeb(user);
        }
    }, [registerNative, registerWeb]);

    return { init };
};