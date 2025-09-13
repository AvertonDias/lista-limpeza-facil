// public/firebase-messaging-sw.js

// Scripts do Firebase
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Configuração do Firebase
// Esta configuração é segura para ser pública.
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
const messaging = firebase.messaging();

// Ouvinte para o evento 'push' (notificações em segundo plano)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push Received.');
  
  if (event.data) {
    try {
        const payload = event.data.json();
        console.log('[firebase-messaging-sw.js] Push payload: ', payload);

        const notificationTitle = payload.data.title || 'Nova Notificação';
        const notificationOptions = {
            body: payload.data.body || '',
            icon: payload.data.icon || '/images/placeholder-icon-192.png',
            badge: '/images/placeholder-icon-192.png',
            data: {
                link: payload.data.link || '/'
            }
        };

        // Garante que o Service Worker espere a notificação ser exibida
        event.waitUntil(
            self.registration.showNotification(notificationTitle, notificationOptions)
        );
    } catch(e) {
        console.error('[firebase-messaging-sw.js] Error parsing push data:', e);
    }
  }
});


// Ouvinte para o evento de clique na notificação
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');

    event.notification.close();

    const link = event.notification.data.link || '/';
    
    // Garante que o Service Worker espere a nova janela/aba ser focada/aberta
    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === link && 'focus' in client)
                    return client.focus();
            }
            if (clients.openWindow)
                return clients.openWindow(link);
        })
    );
});
