// Usando importScripts para carregar o Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Configuração do Firebase do seu aplicativo da web
const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.firebasestorage.app",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Adiciona um ouvinte de eventos para cliques na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificação clicada.');
  event.notification.close();

  const notificationData = event.notification.data;
  const link = notificationData?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(client => client.navigate(link));
      }
      return clients.openWindow(link);
    })
  );
});

// Adiciona um ouvinte para o evento 'push' (notificações recebidas)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Evento push recebido.', event);

  if (!event.data) {
    console.log('[firebase-messaging-sw.js] O evento push não continha dados.');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Payload da notificação:', payload);
  } catch (e) {
    console.error('[firebase-messaging-sw.js] Erro ao analisar o payload como JSON:', e);
    // Tenta ler como texto se JSON falhar
    const textPayload = event.data.text();
    console.log('[firebase-messaging-sw.js] Payload de texto bruto:', textPayload);
    return; 
  }

  const notificationData = payload.data;
  if (!notificationData) {
      console.error('[firebase-messaging-sw.js] O payload não continha um campo "data".');
      return;
  }

  const notificationTitle = notificationData.title || 'Nova Notificação';
  const notificationOptions = {
    body: notificationData.body || '',
    icon: notificationData.icon || '/images/placeholder-icon-192.png',
    badge: notificationData.badge || '/images/badge-icon.png',
    data: {
      link: notificationData.link || '/',
    },
  };
  
  console.log('[firebase-messaging-sw.js] Mostrando notificação com título:', notificationTitle, 'e opções:', notificationOptions);

  const notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions);
  event.waitUntil(notificationPromise);
});
