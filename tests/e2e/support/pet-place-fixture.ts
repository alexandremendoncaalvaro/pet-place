import { expect, Locator, Page, Request, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppConfig, AppEvent, AppNotification, AppPost, Expense, IdentityLinkSuggestion, Payment, Pet, PostComment, SupporterSubscription, UserProfile } from '../../../src/lib/types';

export interface PetPlaceE2EState {
  user: UserProfile | null;
  users: UserProfile[];
  pets: Pet[];
  payments: Payment[];
  supporters: SupporterSubscription[];
  expenses: Expense[];
  config: AppConfig;
  events: AppEvent[];
  notifications: AppNotification[];
  notificationReads: Record<string, string[]>;
  posts: AppPost[];
  comments: Record<string, PostComment[]>;
  identityLinkSuggestions: IdentityLinkSuggestion[];
}

const now = '2026-05-03T12:00:00.000Z';
const currentMonth = '2026-05';
const mediaFixtureDir = join(process.cwd(), 'tests', 'fixtures', 'media');

export function createPetPlaceState(options: { role?: 'admin' | 'resident'; unauthenticated?: boolean; anonymized?: boolean } = {}): PetPlaceE2EState {
  const names = {
    adminName: 'Tutor Azul',
    residentName: 'Tutor Verde',
    linkedName: 'Tutor Laranja',
    offlineName: 'Tutor Cinza',
    adminPet: 'Pet Sol',
    residentPet: 'Pet Nuvem',
    linkedPet: 'Pet Lua',
    offlinePet: 'Pet Chuva',
  };
  const adminUser: UserProfile = {
    uid: 'user-admin',
    name: names.adminName,
    phone: '47999999999',
    dogName: names.adminPet,
    role: 'admin',
    email: 'tutor.azul@example.test',
    familyId: 'family-admin',
    userStatus: 'active',
    photoUrl: '/e2e/tutor-azul.svg',
    createdAt: now,
  };
  const residentUser: UserProfile = {
    uid: 'user-resident',
    name: names.residentName,
    phone: '47988888888',
    dogName: names.residentPet,
    role: 'resident',
    email: 'tutor.verde@example.test',
    familyId: 'family-resident',
    userStatus: 'active',
    photoUrl: '/e2e/tutor-verde.svg',
    createdAt: now,
  };
  const linkedUser: UserProfile = {
    uid: 'user-linked',
    name: names.linkedName,
    phone: '47977777777',
    dogName: names.linkedPet,
    role: 'resident',
    email: 'tutor.laranja@example.test',
    familyId: 'family-linked',
    userStatus: 'active',
    photoUrl: '/e2e/tutor-laranja.svg',
    createdAt: now,
  };
  const offlineUser: UserProfile = {
    uid: 'offline-tutor-cinza',
    name: names.offlineName,
    phone: '47966666666',
    dogName: names.offlinePet,
    role: 'resident',
    email: '',
    familyId: 'offline-tutor-cinza',
    userStatus: 'active',
    isOffline: true,
    createdAt: now,
  };
  const users = [adminUser, residentUser, linkedUser, offlineUser];
  const user = options.unauthenticated ? null : options.role === 'resident' ? residentUser : adminUser;

  return {
    user,
    users,
    pets: [
      { id: 'pet-sol', ownerId: 'user-admin', name: names.adminPet, breed: 'SRD', photoUrl: '/e2e/pet-sol.svg', createdAt: now },
      { id: 'pet-lua', ownerId: 'user-linked', name: names.linkedPet, breed: 'SRD', photoUrl: '/e2e/pet-lua.svg', createdAt: now },
    ],
    payments: [
      { id: 'payment-admin-may', familyId: 'family-admin', month: currentMonth, amount: 25, proofUrl: '/e2e/proof.svg', status: 'approved', type: 'mensalidade', createdAt: now, updatedAt: now, userName: names.adminName, userDog: names.adminPet },
      { id: 'payment-resident-may', familyId: 'family-resident', month: currentMonth, amount: 25, proofUrl: '/e2e/proof.svg', status: 'approved', type: 'mensalidade', createdAt: now, updatedAt: now, userName: names.residentName, userDog: names.residentPet },
      { id: 'payment-linked-pending', familyId: 'family-linked', month: currentMonth, amount: 25, proofUrl: '', status: 'pending', type: 'mensalidade', createdAt: now, updatedAt: now, userName: names.linkedName, userDog: names.linkedPet },
    ],
    supporters: [
      { familyId: 'family-admin', status: 'active', activeSinceMonth: currentMonth, source: 'migration', createdAt: now, updatedAt: now },
      { familyId: 'family-resident', status: 'active', activeSinceMonth: currentMonth, source: 'migration', createdAt: now, updatedAt: now },
      { familyId: 'family-linked', status: 'active', activeSinceMonth: currentMonth, source: 'migration', createdAt: now, updatedAt: now },
      { familyId: 'offline-tutor-cinza', status: 'active', activeSinceMonth: currentMonth, source: 'migration', createdAt: now, updatedAt: now },
    ],
    expenses: [
      { id: 'expense-terreno', date: '2026-05-02', title: 'Manutencao do terreno', category: 'Geral', amount: 150, receiptUrl: '/e2e/proof.svg', createdBy: 'user-admin', createdAt: now },
    ],
    config: {
      pixKey: 'pix@petplace.test',
      monthlyAmount: 25,
      dueDateDay: 10,
      paymentInstructions: 'Pagamento pra Grazi',
      updatedAt: now,
    },
    events: [
      { id: 'event-mutirao', title: 'Mutirao de limpeza', description: 'Domingo de manha vamos organizar o espaco.', date: '2026-05-10', time: '09:00', type: 'event', readBy: [], createdBy: 'user-admin', createdAt: now },
    ],
    notifications: [
      { id: 'notification-comment', userId: user?.uid || 'user-admin', title: 'Comentario no seu post', message: `${names.residentName} comentou na sua publicacao.`, isRead: false, createdAt: now, type: 'post_comment', entityType: 'post', entityId: 'post-welcome' },
    ],
    notificationReads: {},
    posts: [
      { id: 'post-welcome', authorId: 'user-admin', content: `${names.adminPet} brincando no Pet Place com @${names.linkedPet}`, mediaUrl: '/e2e/post-photo.svg', mediaType: 'image', likedBy: ['user-resident'], commentCount: 2, tags: ['pet-lua'], createdAt: '2026-05-02T20:23:00.000Z' },
    ],
    comments: {
      'post-welcome': [
        { id: 'comment-1', postId: 'post-welcome', authorId: 'user-resident', content: 'Tambem vi, ficou lindo.', createdAt: now },
        { id: 'comment-2', postId: 'post-welcome', authorId: 'user-linked', content: `${names.linkedPet} adorou.`, createdAt: now },
      ],
    },
    identityLinkSuggestions: [],
  };
}

export async function installPetPlaceApiMock(page: Page, state: PetPlaceE2EState) {
  await page.addInitScript(() => {
    class MockWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = MockWebSocket.OPEN;
      constructor() {
        super();
        window.setTimeout(() => this.dispatchEvent(new Event('open')), 0);
      }
      send() {}
      close() {
        this.readyState = MockWebSocket.CLOSED;
        this.dispatchEvent(new Event('close'));
      }
    }
    Object.defineProperty(window, 'WebSocket', { value: MockWebSocket });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'denied', requestPermission: async () => 'denied' },
      configurable: true,
    });
  });

  await page.route('**/e2e/tutorial-video.mp4', async (route) => {
    await route.fulfill({
      contentType: 'video/mp4',
      body: readFileSync(join(mediaFixtureDir, 'tutorial-video.mp4')),
      headers: {
        'Accept-Ranges': 'bytes',
      },
    });
  });

  await page.route('**/e2e/*.svg', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()?.replace('.svg', '') || 'pet-place';
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" rx="32" fill="#eef2ff"/><circle cx="320" cy="210" r="96" fill="#2563eb"/><text x="320" y="360" text-anchor="middle" font-family="Arial" font-size="42" fill="#111827">${escapeXml(name)}</text></svg>`,
    });
  });

  await page.route('**/api/**', async (route) => handleApiRoute(route, state));
}

export async function expectImageLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((element) => {
    const img = element as HTMLImageElement;
    const style = window.getComputedStyle(img);
    return {
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      opacity: style.opacity,
    };
  })).toMatchObject({
    complete: true,
    naturalWidth: expect.any(Number),
    naturalHeight: expect.any(Number),
    opacity: '1',
  });
  const size = await image.evaluate((element) => {
    const img = element as HTMLImageElement;
    return img.naturalWidth * img.naturalHeight;
  });
  expect(size).toBeGreaterThan(0);
}

async function handleApiRoute(route: Route, state: PetPlaceE2EState) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method();

  if (method === 'GET' && path === '/health') return json(route, { ok: true, service: 'pet-place' });
  if (method === 'GET' && path === '/auth/me') {
    if (!state.user) return json(route, { error: 'Unauthorized' }, 401);
    return json(route, { user: state.user });
  }
  if (method === 'POST' && path === '/auth/logout') {
    state.user = null;
    return empty(route);
  }
  if (method === 'POST' && path === '/payments/ensure-current-month') {
    const body = safeJson(request.postData() || '{}', {}) as { familyId?: string };
    const familyId = body.familyId || (state.user?.familyId || state.user?.uid || '');
    const supporter = state.supporters.find((item) => item.familyId === familyId);
    if (supporter?.status === 'active' && !state.payments.some((payment) => payment.familyId === familyId && payment.month === currentMonth && payment.type === 'mensalidade')) {
      state.payments.unshift({
        id: `payment-${state.payments.length + 1}`,
        familyId,
        month: currentMonth,
        amount: state.config.monthlyAmount,
        proofUrl: '',
        status: 'pending',
        type: 'mensalidade',
        createdAt: now,
        updatedAt: now,
      });
    }
    return empty(route);
  }

  if (method === 'GET' && path === '/config') return json(route, { config: state.config });
  if (method === 'GET' && path === '/events') return json(route, { events: state.events });
  if (method === 'GET' && path === '/notifications') {
    const targets = state.user?.role === 'admin' ? [state.user.uid, 'all', 'admins'] : [state.user?.uid || '', 'all'];
    return json(route, {
      notifications: state.notifications
        .filter((notification) => targets.includes(notification.userId))
        .map((notification) => ({
          ...notification,
          isRead: notification.userId === 'all' || notification.userId === 'admins'
            ? (state.notificationReads[notification.id] || []).includes(state.user?.uid || '')
            : notification.isRead,
        })),
    });
  }
  if (method === 'GET' && path === '/expenses') return json(route, { expenses: state.expenses });
  if (method === 'GET' && path === '/public-profiles') return json(route, { profiles: state.users.filter((user) => user.userStatus !== 'blocked') });
  if (method === 'GET' && path === '/users') return json(route, { users: state.users });
  if (method === 'GET' && path === '/supporters') {
    if (url.searchParams.get('all') === '1') return json(route, { supporters: state.supporters });
    const familyId = url.searchParams.get('familyId') || state.user?.familyId || state.user?.uid || '';
    return json(route, { supporter: state.supporters.find((item) => item.familyId === familyId) || { familyId, status: 'paused', source: 'self', createdAt: '', updatedAt: '' } });
  }
  if (method === 'GET' && path === '/identity-link-suggestions') return json(route, { suggestions: state.identityLinkSuggestions });
  if (method === 'GET' && path === '/pets') {
    const ownerId = url.searchParams.get('ownerId');
    return json(route, { pets: ownerId ? state.pets.filter((pet) => pet.ownerId === ownerId) : state.pets });
  }
  if (method === 'GET' && path === '/payments') {
    const all = url.searchParams.get('all') === '1';
    const familyId = url.searchParams.get('familyId');
    const payments = all ? state.payments : state.payments.filter((payment) => payment.familyId === familyId);
    return json(route, { payments });
  }
  if (method === 'GET' && path === '/posts') return json(route, { posts: state.posts });

  const commentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
  if (method === 'GET' && commentsMatch) return json(route, { comments: state.comments[decodeURIComponent(commentsMatch[1])] || [] });

  if (method === 'POST' && path === '/posts') {
    const form = await readMultipart(request);
    const data = safeJson(form.data, {}) as Partial<AppPost>;
    const post: AppPost = {
      id: `post-${state.posts.length + 1}`,
      authorId: data.authorId || state.user?.uid || 'user-admin',
      content: data.content || '',
      mediaType: data.mediaType,
      mediaUrl: form.media ? data.mediaType === 'video' ? '/e2e/tutorial-video.mp4' : '/e2e/post-photo.svg' : undefined,
      posterUrl: form.poster ? '/e2e/post-photo.svg' : undefined,
      likedBy: [],
      commentCount: 0,
      tags: data.tags || [],
      createdAt: now,
    };
    state.posts = [post, ...state.posts];
    state.comments[post.id] = [];
    notifyMentionTargets(state, post.tags || [], post.authorId, post.id);
    return json(route, { id: post.id });
  }

  const likeMatch = path.match(/^\/posts\/([^/]+)\/toggle-like$/);
  if (method === 'POST' && likeMatch && state.user) {
    const post = state.posts.find((item) => item.id === decodeURIComponent(likeMatch[1]));
    if (post) {
      const wasLiked = post.likedBy.includes(state.user.uid);
      post.likedBy = post.likedBy.includes(state.user.uid)
        ? post.likedBy.filter((uid) => uid !== state.user?.uid)
        : [...post.likedBy, state.user.uid];
      if (!wasLiked && post.authorId !== state.user.uid) {
        state.notifications.unshift({
          id: `notification-like-${Date.now()}`,
          userId: post.authorId,
          title: 'Nova curtida',
          message: `${state.user.name.split(/\s+/)[0]} curtiu sua publicacao.`,
          isRead: false,
          createdAt: now,
          type: 'post_like',
          entityType: 'post',
          entityId: post.id,
        });
      }
    }
    return empty(route);
  }

  if (method === 'POST' && commentsMatch && state.user) {
    const postId = decodeURIComponent(commentsMatch[1]);
    const body = safeJson(request.postData() || '{}', {}) as { content?: string; tags?: string[] };
    const comment: PostComment = { id: `comment-${Date.now()}`, postId, authorId: state.user.uid, content: body.content || '', tags: body.tags || [], createdAt: now };
    state.comments[postId] = [...(state.comments[postId] || []), comment];
    const post = state.posts.find((item) => item.id === postId);
    if (post) post.commentCount = state.comments[postId].length;
    const mentioned = notifyMentionTargets(state, comment.tags || [], state.user.uid, postId, comment.id);
    if (post && post.authorId !== state.user.uid && !mentioned.includes(post.authorId)) {
      state.notifications.unshift({
        id: `notification-comment-${Date.now()}`,
        userId: post.authorId,
        title: 'Novo comentário',
        message: `${state.user.name.split(/\s+/)[0]} comentou na sua publicacao.`,
        isRead: false,
        createdAt: now,
        type: 'post_comment',
        entityType: 'post',
        entityId: postId,
      });
    }
    return empty(route);
  }

  if (method === 'POST' && path === '/notifications') {
    const body = safeJson(request.postData() || '{}', {}) as Partial<AppNotification>;
    state.notifications.unshift({ id: `notification-${Date.now()}`, userId: body.userId || 'all', title: body.title || 'Notificacao', message: body.message || '', isRead: false, createdAt: now, type: body.type || 'generic' });
    return empty(route);
  }

  const notificationReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (method === 'PATCH' && notificationReadMatch) {
    const notification = state.notifications.find((item) => item.id === decodeURIComponent(notificationReadMatch[1]));
    if (notification?.userId === 'all' || notification?.userId === 'admins') {
      state.notificationReads[notification.id] = Array.from(new Set([...(state.notificationReads[notification.id] || []), state.user?.uid || '']));
    } else if (notification) notification.isRead = true;
    return empty(route);
  }

  const eventReadMatch = path.match(/^\/events\/([^/]+)\/read$/);
  if (method === 'POST' && eventReadMatch && state.user) {
    const event = state.events.find((item) => item.id === decodeURIComponent(eventReadMatch[1]));
    if (event) event.readBy = Array.from(new Set([...(event.readBy || []), state.user.uid]));
    return empty(route);
  }

  const userPatchMatch = path.match(/^\/users\/([^/]+)$/);
  if (method === 'PATCH' && userPatchMatch) {
    const form = await readMultipart(request);
    const data = safeJson(form.data, {}) as Partial<UserProfile>;
    const uid = decodeURIComponent(userPatchMatch[1]);
    state.users = state.users.map((user) => user.uid === uid ? { ...user, ...data } : user);
    if (state.user?.uid === uid) state.user = { ...state.user, ...data };
    return empty(route);
  }

  if (method === 'POST' && path === '/users/offline') {
    const body = safeJson(request.postData() || '{}', {}) as { name?: string; phone?: string; dogName?: string };
    const uid = `offline-${state.users.length + 1}`;
    const offlineUser: UserProfile = {
      uid,
      name: body.name || 'Pessoa offline',
      phone: body.phone || '',
      dogName: body.dogName || '',
      role: 'resident',
      email: '',
      familyId: uid,
      userStatus: 'active',
      isOffline: true,
      createdAt: now,
    };
    state.users.push(offlineUser);
    return json(route, { user: offlineUser });
  }

  const supporterPatchMatch = path.match(/^\/supporters\/([^/]+)$/);
  if (method === 'PATCH' && supporterPatchMatch) {
    const familyId = decodeURIComponent(supporterPatchMatch[1]);
    const body = safeJson(request.postData() || '{}', {}) as { status?: SupporterSubscription['status']; cancelCurrentPending?: boolean };
    const existing = state.supporters.find((item) => item.familyId === familyId);
    const supporter: SupporterSubscription = {
      familyId,
      status: body.status || 'paused',
      activeSinceMonth: body.status === 'active' ? currentMonth : existing?.activeSinceMonth,
      pausedAt: body.status === 'paused' ? now : undefined,
      source: state.user?.role === 'admin' ? 'admin' : 'self',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    state.supporters = existing
      ? state.supporters.map((item) => item.familyId === familyId ? supporter : item)
      : [...state.supporters, supporter];
    if (body.status === 'paused' && body.cancelCurrentPending) {
      state.payments = state.payments.filter((payment) => !(payment.familyId === familyId && payment.month === currentMonth && payment.type === 'mensalidade' && (payment.status === 'pending' || payment.status === 'rejected')));
    }
    if (body.status === 'active' && !state.payments.some((payment) => payment.familyId === familyId && payment.month === currentMonth && payment.type === 'mensalidade')) {
      state.payments.unshift({
        id: `payment-${state.payments.length + 1}`,
        familyId,
        month: currentMonth,
        amount: state.config.monthlyAmount,
        proofUrl: '',
        status: 'pending',
        type: 'mensalidade',
        createdAt: now,
        updatedAt: now,
      });
    }
    return json(route, { supporter });
  }

  if (method === 'POST' && path === '/payments/manual') {
    const form = await readMultipart(request);
    state.payments.unshift({
      id: `payment-${state.payments.length + 1}`,
      familyId: form.familyId || 'offline',
      amount: Number(form.amount || 0),
      month: form.month || currentMonth,
      type: (form.type as Payment['type']) || 'mensalidade',
      description: form.description,
      proofUrl: '/e2e/proof.svg',
      status: 'approved',
      createdAt: now,
      updatedAt: now,
    });
    return empty(route);
  }

  const proofMatch = path.match(/^\/payments\/([^/]+)\/proof$/);
  if (method === 'POST' && proofMatch) {
    const payment = state.payments.find((item) => item.id === decodeURIComponent(proofMatch[1]));
    if (payment) {
      payment.status = 'analyzing';
      payment.proofUrl = '/e2e/proof.svg';
    }
    return empty(route);
  }

  return json(route, { error: `Unhandled E2E route ${method} ${path}` }, 501);
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function empty(route: Route) {
  await route.fulfill({ status: 204 });
}

async function readMultipart(request: Request): Promise<Record<string, string>> {
  const buffer = await request.postDataBuffer();
  const raw = buffer?.toString('utf8') || '';
  const fields: Record<string, string> = {};
  for (const part of raw.split(/\r?\n--/)) {
    const name = part.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const isFile = /filename="[^"]+"/.test(part);
    const [, value = ''] = part.split(/\r?\n\r?\n/);
    fields[name] = isFile ? '__file__' : value.replace(/\r?\n--$/, '').replace(/\r?\n$/, '').trim();
  }
  return fields;
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function notifyMentionTargets(state: PetPlaceE2EState, tags: string[], actorId: string, postId: string, commentId?: string) {
  const mentioned = resolveMentionTargets(state, tags, actorId);
  const actor = state.users.find((user) => user.uid === actorId);
  mentioned.forEach((userId) => {
    state.notifications.unshift({
      id: `notification-mention-${Date.now()}-${userId}`,
      userId,
      title: 'Nova menção',
      message: `${actor?.name.split(/\s+/)[0] || 'Alguém'} marcou você ou seu pet ${commentId ? 'em um comentário' : 'em uma publicação'}.`,
      isRead: false,
      createdAt: now,
      type: 'mention',
      entityType: commentId ? 'comment' : 'post',
      entityId: commentId || postId,
      data: { postId, ...(commentId ? { commentId } : {}) },
    });
  });
  return mentioned;
}

function resolveMentionTargets(state: PetPlaceE2EState, tags: string[], actorId: string) {
  const targets = new Set<string>();
  [...new Set(tags)].slice(0, 10).forEach((tag) => {
    const profile = state.users.find((user) => user.uid === tag && user.userStatus !== 'blocked');
    if (profile) {
      targets.add(profile.uid);
      return;
    }
    const pet = state.pets.find((item) => item.id === tag);
    if (!pet) return;
    const owner = state.users.find((user) => user.uid === pet.ownerId);
    const familyId = owner?.familyId || owner?.uid;
    state.users
      .filter((user) => user.userStatus !== 'blocked' && (user.familyId || user.uid) === familyId)
      .forEach((user) => targets.add(user.uid));
  });
  targets.delete(actorId);
  return [...targets];
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));
}
