// sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:    "AIzaSyC0ssHxRUZfLjj_tnfNvYo2M0XM6PdkUxo",
  authDomain:"job-tracker-app-43908.firebaseapp.com",
  projectId: "job-tracker-app-43908",
  storageBucket:"job-tracker-app-43908.appspot.com",
  messagingSenderId:"290524265470",
  appId:     "1:290524265470:web:e2bf1b405763de26631eaf",
  measurementId:"G-7XE1Z7CTVQ"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: 'icons/icon-192.png'
    }
  );
});
