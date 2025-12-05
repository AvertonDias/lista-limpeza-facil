"use client";

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { getToken } from "firebase/messaging";
import { db, messaging } from '@/lib/firebase';
import { useToast } from './use-toast'; // Verifique se o caminho está correto
import { doc, arrayUnion, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export const useNotificationManager = () => {
    const { toast: uiToast } = useToast();

    // Função auxiliar para salvar no Firestore (usada tanto por Web quanto Native)
    const saveTokenToFirestore = async (uid: string, token: string) => {
        if (!uid || !token) return;

        try {
            const userDocRef = doc(db, "users", uid);
            // setDoc com merge: true cria se não existir ou atualiza se existir.
            // arrayUnion garante que não haverá tokens duplicados.
            await setDoc(userDocRef, { 
                fcmTokens: arrayUnion(token),
                updatedAt: new Date().toISOString() // Opcional: útil para saber quando atualizou
            }, { merge: true });

            console.log("Token FCM salvo/atualizado com sucesso no Firestore.");
        } catch (error: any) {
            console.error("Erro ao salvar token no Firestore:", error);
            uiToast({
                variant: "destructive",
                title: "Erro de Banco de Dados",
                description: "Não foi possível vincular o dispositivo ao seu usuário.",
            });
        }
    };

    const registerNative = useCallback(async (user: User) => {
        if (!user) return;

        // 1. Registrar Listeners ANTES de solicitar registro
        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', (token) => {
            console.info('Native Registration token: ', token.value);
            saveTokenToFirestore(user.uid, token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on native registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            uiToast({
                title: notification.title || "Nova Notificação",
                description: notification.body || "",
            });
        });

        // 2. Verificar e Solicitar Permissões
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            await Toast.show({ text: 'Permissão de notificação negada.' });
            return;
        }

        // 3. Efetuar Registro
        await PushNotifications.register();

    }, [uiToast]);

    const registerWeb = useCallback(async (user: User) => {
        if (!user || !messaging) {
            console.warn("Usuário ou Firebase Messaging não está disponível.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === "granted") {
                console.log("Permissão Web concedida.");
                
                // IMPORTANTE: Substitua pela sua chave pública do console do Firebase
                // (Configurações do Projeto -> Cloud Messaging -> Web Push Certificates)
                const vapidKey = "BGgAa0C-KPGKCA0baZggbWM9qWrGyNw4JGyECyAVGoB3Y8F7KDbMEvX0JVh3EyqOj5SkS0ozHLrmWmzr8CsJvO8"; 

                let tokenOptions = { vapidKey };

                // Registro explícito do Service Worker para evitar erros comuns em React/Next.js
                if ('serviceWorker' in navigator) {
                    try {
                        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        // Passar o registration garante que o getToken use o SW correto
                        tokenOptions = { ...tokenOptions, serviceWorkerRegistration: registration } as any;
                    } catch (swError) {
                        console.error("Erro ao registrar Service Worker:", swError);
                    }
                }

                const fcmToken = await getToken(messaging, tokenOptions);

                if (fcmToken) {
                    console.log("Token Web gerado:", fcmToken);
                    await saveTokenToFirestore(user.uid, fcmToken);
                } else {
                    console.warn("Nenhum token de registro disponível. Solicite permissão para gerar um.");
                }

            } else {
                console.warn("Permissão de notificação Web negada.");
            }
        } catch (error) {
            console.error("Erro fatal ao registrar notificações Web:", error);
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