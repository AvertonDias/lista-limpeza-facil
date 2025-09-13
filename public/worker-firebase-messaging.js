// This file must be in the public folder.
// It is used by the PWA to handle background notifications.

try {
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
    authDomain: "studio-1326322560-ad791.firebaseapp.com",
    projectId: "studio-1326322560-ad791",
    storageBucket: "studio-1326322560-ad791.appspot.com",
    messagingSenderId: "417616889091",
    appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
  };

  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Mensagem recebida em segundo plano:', payload);

    if (payload.webpush?.notification) {
      const { title, body, icon } = payload.webpush.notification;
      const link = payload.webpush.fcm_options?.link || '/';

      self.registration.showNotification(title, {
        body,
        icon,
        data: { click_action: link }
      });
    }
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data.click_action || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  });

} catch (e) {
  console.error("Error in service worker, push notifications will not work.", e);
}
