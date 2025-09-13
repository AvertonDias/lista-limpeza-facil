// Import scripts for Firebase
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.firebasestorage.app",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

// --- Event Listeners for Service Worker ---

// This listener handles the click on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// This listener handles incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received.', event);

  let pushData;
  try {
    pushData = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', pushData);
  } catch (e) {
    console.error('[firebase-messaging-sw.js] Failed to parse push data:', e);
    return;
  }

  if (!pushData || !pushData.data) {
      console.error('[firebase-messaging-sw.js] Push data is missing `data` field.');
      return;
  }

  const { title, body, icon, link } = pushData.data;

  // These are the options for the notification that will be shown
  const notificationOptions = {
    body: body,
    icon: icon, // The main, larger icon
    badge: icon, // The small icon (badge) that replaces the bell
    data: {
      url: link, // URL to open on click
    },
  };

  const notificationPromise = self.registration.showNotification(
    title,
    notificationOptions
  );
  event.waitUntil(notificationPromise);
});

console.log('[firebase-messaging-sw.js] Service worker loaded.');
