// Import the Firebase app and messaging packages.
// This is the "compat" version that works with the v8 SDK syntax.
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");


// The service worker needs its own Firebase config.
// IMPORTANT: Replace this with your project's config object.
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

// onBackgroundMessage is used to handle messages received when the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log("Mensagem recebida em segundo plano:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/images/placeholder-icon.png?v=2",
    // Use the link from the payload if it exists, otherwise default to the root.
    data: {
      url: payload.fcmOptions?.link || "/",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// This event is fired when a user clicks on a notification.
self.addEventListener("notificationclick", (event) => {
  console.log("On notification click: ", event.notification);
  // Close the notification.
  event.notification.close();

  // This looks at all open tabs and focuses on the first one that matches the URL.
  // If there are no matching tabs, it opens a new one.
  const promiseChain = clients
    .matchAll({
      type: "window",
      includeUncontrolled: true,
    })
    .then((clientList) => {
      const urlToOpen = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});
