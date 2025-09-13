// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Inicialize o Firebase no Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536",
});

const messaging = firebase.messaging();

// Função para exibir notificação evitando duplicadas
const showNotification = (payload) => {
  const notification = payload.notification || payload.data;
  const { title, body, icon } = notification || {};
  const tag = payload.messageId || 'default-tag'; // tag evita duplicação

  if (title && body) {
    self.registration.showNotification(title, {
      body,
      icon: icon || '/images/placeholder-icon.png?v=2',
      tag, // Service Worker usa a tag para não repetir a mesma notificação
      data: payload.data || {},
    });
  }
};

// Mensagens recebidas em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Mensagem recebida em segundo plano:', payload);
  showNotification(payload);
});

// Optional: captura de clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === new URL(clickAction, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
