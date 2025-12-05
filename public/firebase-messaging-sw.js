/* eslint-disable no-undef */
// Service Worker para Firebase Cloud Messaging

// Versão 9.23.0 (mais estável e compatível)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.appspot.com",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Recupera a instância de mensagens
const messaging = firebase.messaging();

// Handler para mensagens em segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificação recebida em background:', payload);

  const notificationTitle = payload.notification.title;
  
  const notificationOptions = {
    body: payload.notification.body,
    // Caminho atualizado conforme sua pasta public
    icon: '/images/placeholder-icon.png', 
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});