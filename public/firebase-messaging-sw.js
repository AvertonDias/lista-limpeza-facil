// Use importScripts para carregar o SDK do Firebase
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Suas credenciais do Firebase
// É seguro tê-las aqui, pois o Service Worker é um código do lado do cliente.
const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.firebasestorage.app",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Obtém uma instância do Messaging.
const messaging = firebase.messaging();

// Adiciona um "ouvinte" para mensagens recebidas em segundo plano.
messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image, // Garante que o ícone seja usado
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
