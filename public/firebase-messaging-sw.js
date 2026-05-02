// public/firebase-messaging-sw.js
// Service Worker para Push Notifications em background (tela travada / app fechado)

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD5vH_TX2lCZAS6gjbp31H0sSeuu6aZ15M",
  authDomain: "gen-lang-client-0734279700.firebaseapp.com",
  projectId: "gen-lang-client-0734279700",
  storageBucket: "gen-lang-client-0734279700.firebasestorage.app",
  messagingSenderId: "246731267780",
  appId: "1:246731267780:web:3d4391f23ed1c998cb3391"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Push recebido em background:', payload);

  const notificationTitle = payload.notification?.title || 'Caixinha Pet Place';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [200, 100, 200],
    tag: 'caixinha-notification',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
