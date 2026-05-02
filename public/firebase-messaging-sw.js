// public/firebase-messaging-sw.js

// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Default config. In production this should match your real config
// but since the service worker runs isolated, it needs its own initializeApp
const firebaseConfig = {
  // You would ideally inject these via build process or rely on 
  // URL params, but usually hardcoding the safe public pieces is standard practice 
  // for this specific file, or you can fetch it if needed.
};

// If firebase-applet-config.json was accessible, one could use it, but since this is static,
// we just setup a minimal stub. If you want background messages, you MUST 
// put your valid public keys here or configure them manually later.
/* 
firebase.initializeApp({
  apiKey: "...",
  projectId: "...",
  messagingSenderId: "...",
  appId: "..."
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
*/
