import { AppConfig, AppEvent, AppNotification, AppPost, Expense, Payment, PaymentStatus, Pet, PostComment, Role, UserProfile } from '../lib/types';
import { API_BASE, api, toApiError } from './http';
import { notifyDataChanged, subscribe } from './subscriptions';
import { compressImage } from './uploads';
export { requestPushToken } from './push';

export let isRealBackend = true;

export async function initBackend() {
  try {
    await api('/health');
    isRealBackend = true;
  } catch (error) {
    console.warn('Cloudflare backend unavailable.', error);
    isRealBackend = false;
  }
}

export function setMockRole(_role: 'admin' | 'resident') {
  // Mantido apenas por compatibilidade com a UI antiga de mock.
}

export async function loginWithGoogle(): Promise<UserProfile | null> {
  window.location.href = `${API_BASE}/api/auth/google/start?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  return null;
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' });
  notifyDataChanged();
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  return subscribe(async () => {
    try {
      const res = await api<{ user: UserProfile }>('/auth/me');
      return res.user;
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) return null;
      throw error;
    }
  }, callback, 60000);
}

export async function ensureCurrentMonthPayment(familyId: string, notify = true) {
  await api('/payments/ensure-current-month', {
    method: 'POST',
    body: JSON.stringify({ familyId }),
  });
  if (notify) notifyDataChanged();
}

export function subscribeToMyPayments(familyId: string, callback: (payments: Payment[]) => void) {
  return subscribe(async () => (await api<{ payments: Payment[] }>(`/payments?familyId=${encodeURIComponent(familyId)}`)).payments, callback);
}

export function subscribeToAllPayments(callback: (payments: Payment[]) => void) {
  return subscribe(async () => (await api<{ payments: Payment[] }>('/payments?all=1')).payments, callback);
}

export function subscribeToAllExpenses(callback: (expenses: Expense[]) => void) {
  return subscribe(async () => (await api<{ expenses: Expense[] }>('/expenses')).expenses, callback);
}

export function subscribeToAllPets(callback: (pets: Pet[]) => void) {
  return subscribe(async () => (await api<{ pets: Pet[] }>('/pets')).pets, callback);
}

export function subscribeToAllPublicProfiles(callback: (profiles: UserProfile[]) => void) {
  return subscribe(async () => (await api<{ profiles: UserProfile[] }>('/public-profiles')).profiles, callback);
}

export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  return subscribe(async () => (await api<{ users: UserProfile[] }>('/users')).users, callback);
}

export function subscribeToConfig(callback: (config: AppConfig | null) => void) {
  return subscribe(async () => (await api<{ config: AppConfig | null }>('/config')).config, callback);
}

export async function submitDonation(amount: number, file: File, familyId: string) {
  const form = new FormData();
  form.set('amount', String(amount));
  form.set('familyId', familyId);
  form.set('file', file);
  await api('/payments/donation', { method: 'POST', body: form });
  notifyDataChanged();
}

export async function uploadProofAndSubmit(paymentId: string, file: File) {
  const form = new FormData();
  form.set('file', file);
  await api(`/payments/${encodeURIComponent(paymentId)}/proof`, { method: 'POST', body: form });
  notifyDataChanged();
}

export async function approvePayment(paymentId: string) {
  await updatePaymentStatus(paymentId, 'approved');
}

export async function rejectPayment(paymentId: string) {
  await updatePaymentStatus(paymentId, 'rejected');
}

async function updatePaymentStatus(paymentId: string, status: PaymentStatus) {
  await api(`/payments/${encodeURIComponent(paymentId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  notifyDataChanged();
}

export async function deletePayment(paymentId: string) {
  await api(`/payments/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
  notifyDataChanged();
}

export async function createCharges(charges: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'proofUrl'>[]) {
  await api('/payments/charges', {
    method: 'POST',
    body: JSON.stringify({ charges }),
  });
  notifyDataChanged();
}

export async function addExpense(expense: Omit<Expense, 'id' | 'receiptUrl'>, file: File) {
  const form = new FormData();
  form.set('data', JSON.stringify(expense));
  form.set('file', file);
  await api('/expenses', { method: 'POST', body: form });
  notifyDataChanged();
}

export async function updateProfile(userId: string, data: Partial<UserProfile>, photoFile?: File) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (photoFile) form.set('photo', await compressImage(photoFile));
  await api(`/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: form });
  notifyDataChanged();
}

export async function updateConfig(data: { pixKey?: string; monthlyAmount?: number; dueDateDay?: number; paymentInstructions?: string }) {
  await api('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  notifyDataChanged();
}

export function subscribeToMyPets(userId: string, callback: (pets: Pet[]) => void) {
  return subscribe(async () => (await api<{ pets: Pet[] }>(`/pets?ownerId=${encodeURIComponent(userId)}`)).pets, callback);
}

export async function addPet(data: Omit<Pet, 'id' | 'createdAt'>, photoFile?: File) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (photoFile) form.set('photo', await compressImage(photoFile));
  await api('/pets', { method: 'POST', body: form });
  notifyDataChanged();
}

export async function updatePet(petId: string, data: Partial<Omit<Pet, 'id' | 'createdAt'>>, photoFile?: File) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (photoFile) form.set('photo', await compressImage(photoFile));
  await api(`/pets/${encodeURIComponent(petId)}`, { method: 'PATCH', body: form });
  notifyDataChanged();
}

export async function deletePet(petId: string) {
  await api(`/pets/${encodeURIComponent(petId)}`, { method: 'DELETE' });
  notifyDataChanged();
}

export function subscribeToAllEvents(callback: (events: AppEvent[]) => void) {
  return subscribe(async () => (await api<{ events: AppEvent[] }>('/events')).events, callback);
}

export async function addEvent(data: Omit<AppEvent, 'id' | 'createdAt'>) {
  const res = await api<{ event: AppEvent }>('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  notifyDataChanged();
  return res.event.id;
}

export async function deleteEvent(eventId: string) {
  await api(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  notifyDataChanged();
}

export async function markEventAsRead(eventId: string, _userId: string) {
  await api(`/events/${encodeURIComponent(eventId)}/read`, { method: 'POST' });
  notifyDataChanged();
}

export function subscribeToMyNotifications(_userId: string, _role: string, callback: (n: AppNotification[]) => void) {
  return subscribe(async () => (await api<{ notifications: AppNotification[] }>('/notifications')).notifications, callback, 30000);
}

export async function markNotificationAsRead(notificationId: string) {
  await api(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
  notifyDataChanged();
}

export async function addNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
  await api('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  notifyDataChanged();
}

export function subscribeToAllPosts(limitAmount: number, callback: (posts: AppPost[]) => void) {
  return subscribe(async () => (await api<{ posts: AppPost[] }>(`/posts?limit=${limitAmount}`)).posts, callback, 30000);
}

export async function addPost(data: Omit<AppPost, 'id' | 'createdAt' | 'likedBy'>, mediaFile?: File) {
  const form = new FormData();
  form.set('data', JSON.stringify(data));
  if (mediaFile) {
    const file = data.mediaType === 'image' ? await compressImage(mediaFile) : mediaFile;
    form.set('media', file);
  }
  const res = await api<{ id: string }>('/posts', { method: 'POST', body: form });
  notifyDataChanged();
  return res.id;
}

export async function deletePost(postId: string) {
  await api(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  notifyDataChanged();
}

export async function updatePost(postId: string, content: string, tags: string[]) {
  await api(`/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content, tags }),
  });
  notifyDataChanged();
}

export function subscribeToComments(postId: string, callback: (comments: PostComment[]) => void) {
  return subscribe(async () => (await api<{ comments: PostComment[] }>(`/posts/${encodeURIComponent(postId)}/comments`)).comments, callback, 30000);
}

export async function addComment(postId: string, authorId: string, content: string) {
  await api(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ authorId, content }),
  });
  notifyDataChanged();
}

export async function deleteComment(commentId: string) {
  await api(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  notifyDataChanged();
}

export async function togglePostLike(postId: string, _userId: string, currentlyLiked: boolean) {
  await api(`/posts/${encodeURIComponent(postId)}/toggle-like`, {
    method: 'POST',
    body: JSON.stringify({ currentlyLiked }),
  });
  notifyDataChanged();
}

export async function exportFullBackup(): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/api/backup`, { credentials: 'include' });
  if (!res.ok) throw await toApiError(res);
  return await res.blob();
}

export async function restoreZippedBackup(zipFile: File): Promise<void> {
  const form = new FormData();
  form.set('file', zipFile);
  await api('/backup/restore', { method: 'POST', body: form });
  notifyDataChanged();
}

export async function deleteUserAndData(userId: string) {
  await api(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  notifyDataChanged();
}
