import { api } from './http';

export async function requestPushToken(_userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  await unregisterLegacyServiceWorkers();

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') return;

  const { publicKey } = await api<{ publicKey: string }>('/push/vapid-public-key');
  if (!publicKey) return;

  const registration = await navigator.serviceWorker.register('/push-sw.js');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await api('/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
}

async function unregisterLegacyServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
        return scriptUrl.includes('firebase-messaging-sw.js');
      })
      .map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Legacy service worker cleanup failed:', error);
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
