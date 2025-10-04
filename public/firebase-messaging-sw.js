/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.appspot.com",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Mensagem recebida em background: ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || "/images/placeholder-icon.png?v=2",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
