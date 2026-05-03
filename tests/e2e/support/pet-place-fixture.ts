import { expect, Locator, Page, Request, Route } from '@playwright/test';
import { AppConfig, AppEvent, AppNotification, AppPost, Expense, IdentityLinkSuggestion, Payment, Pet, PostComment, UserProfile } from '../../../src/lib/types';

export interface PetPlaceE2EState {
  user: UserProfile | null;
  users: UserProfile[];
  pets: Pet[];
  payments: Payment[];
  expenses: Expense[];
  config: AppConfig;
  events: AppEvent[];
  notifications: AppNotification[];
  posts: AppPost[];
  comments: Record<string, PostComment[]>;
  identityLinkSuggestions: IdentityLinkSuggestion[];
}

const now = '2026-05-03T12:00:00.000Z';
const currentMonth = '2026-05';

export function createPetPlaceState(options: { role?: 'admin' | 'resident'; unauthenticated?: boolean } = {}): PetPlaceE2EState {
  const alexandre: UserProfile = {
    uid: 'user-admin',
    name: 'Alexandre Mendonca Alvaro',
    phone: '47999999999',
    dogName: 'Amora',
    role: 'admin',
    email: 'alexandre@example.com',
    familyId: 'family-admin',
    userStatus: 'active',
    photoUrl: '/e2e/alexandre.svg',
    createdAt: now,
  };
  const bruna: UserProfile = {
    uid: 'user-bruna',
    name: 'Bruna Silva',
    phone: '47988888888',
    dogName: 'Nina',
    role: 'resident',
    email: 'bruna@example.com',
    familyId: 'family-bruna',
    userStatus: 'active',
    photoUrl: '/e2e/bruna.svg',
    createdAt: now,
  };
  const marielle: UserProfile = {
    uid: 'user-marielle',
    name: 'Marielle Santos',
    phone: '47977777777',
    dogName: 'Belinha',
    role: 'resident',
    email: 'marielle@example.com',
    familyId: 'family-marielle',
    userStatus: 'active',
    photoUrl: '/e2e/marielle.svg',
    createdAt: now,
  };
  const evertonOffline: UserProfile = {
    uid: 'offline-everton',
    name: 'Everton Lima',
    phone: '47966666666',
    dogName: 'Thor',
    role: 'resident',
    email: '',
    familyId: 'offline-everton',
    userStatus: 'active',
    isOffline: true,
    createdAt: now,
  };
  const users = [alexandre, bruna, marielle, evertonOffline];
  const user = options.unauthenticated ? null : options.role === 'resident' ? bruna : alexandre;

  return {
    user,
    users,
    pets: [
      { id: 'pet-amora', ownerId: 'user-admin', name: 'Amora', breed: 'SRD', photoUrl: '/e2e/amora.svg', createdAt: now },
      { id: 'pet-belinha', ownerId: 'user-marielle', name: 'Belinha', breed: 'Pinscher', photoUrl: '/e2e/belinha.svg', createdAt: now },
    ],
    payments: [
      { id: 'payment-admin-may', familyId: 'family-admin', month: currentMonth, amount: 25, proofUrl: '/e2e/proof.svg', status: 'approved', type: 'mensalidade', createdAt: now, updatedAt: now, userName: 'Alexandre', userDog: 'Amora' },
      { id: 'payment-bruna-may', familyId: 'family-bruna', month: currentMonth, amount: 25, proofUrl: '/e2e/proof.svg', status: 'approved', type: 'mensalidade', createdAt: now, updatedAt: now, userName: 'Bruna', userDog: 'Nina' },
      { id: 'payment-pending', familyId: 'family-marielle', month: currentMonth, amount: 25, proofUrl: '', status: 'pending', type: 'mensalidade', createdAt: now, updatedAt: now, userName: 'Marielle', userDog: 'Belinha' },
    ],
    expenses: [
      { id: 'expense-terreno', date: '2026-05-02', title: 'Tadeu rocou o terreno', category: 'Geral', amount: 150, receiptUrl: '/e2e/proof.svg', createdBy: 'user-admin', createdAt: now },
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
      { id: 'notification-comment', userId: user?.uid || 'user-admin', title: 'Comentario no seu post', message: 'Bruna comentou na sua publicacao.', isRead: false, createdAt: now, type: 'post_comment', entityType: 'post', entityId: 'post-welcome' },
    ],
    posts: [
      { id: 'post-welcome', authorId: 'user-admin', content: 'Amora brincando no Pet Place com @Belinha', mediaUrl: '/e2e/post-photo.svg', mediaType: 'image', likedBy: ['user-bruna'], commentCount: 2, tags: ['pet-belinha'], createdAt: '2026-05-02T20:23:00.000Z' },
    ],
    comments: {
      'post-welcome': [
        { id: 'comment-1', postId: 'post-welcome', authorId: 'user-bruna', content: 'Tambem vi, ficou lindo.', createdAt: now },
        { id: 'comment-2', postId: 'post-welcome', authorId: 'user-marielle', content: 'Belinha adorou.', createdAt: now },
      ],
    },
    identityLinkSuggestions: [
      { id: 'suggestion-marielle', sourceUserId: 'offline-marielle', sourceName: 'Marielle offline', sourcePhone: '47977777777', targetUserId: 'user-marielle', targetName: 'Marielle Santos', targetPhone: '47977777777', phone: '47977777777', status: 'pending', createdAt: now },
    ],
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
  if (method === 'POST' && path === '/payments/ensure-current-month') return empty(route);

  if (method === 'GET' && path === '/config') return json(route, { config: state.config });
  if (method === 'GET' && path === '/events') return json(route, { events: state.events });
  if (method === 'GET' && path === '/notifications') return json(route, { notifications: state.notifications });
  if (method === 'GET' && path === '/expenses') return json(route, { expenses: state.expenses });
  if (method === 'GET' && path === '/public-profiles') return json(route, { profiles: state.users.filter((user) => user.userStatus !== 'blocked') });
  if (method === 'GET' && path === '/users') return json(route, { users: state.users });
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
      mediaUrl: form.media ? '/e2e/post-photo.svg' : undefined,
      posterUrl: form.poster ? '/e2e/post-photo.svg' : undefined,
      likedBy: [],
      commentCount: 0,
      tags: data.tags || [],
      createdAt: now,
    };
    state.posts = [post, ...state.posts];
    state.comments[post.id] = [];
    return json(route, { id: post.id });
  }

  const likeMatch = path.match(/^\/posts\/([^/]+)\/toggle-like$/);
  if (method === 'POST' && likeMatch && state.user) {
    const post = state.posts.find((item) => item.id === decodeURIComponent(likeMatch[1]));
    if (post) {
      post.likedBy = post.likedBy.includes(state.user.uid)
        ? post.likedBy.filter((uid) => uid !== state.user?.uid)
        : [...post.likedBy, state.user.uid];
    }
    return empty(route);
  }

  if (method === 'POST' && commentsMatch && state.user) {
    const postId = decodeURIComponent(commentsMatch[1]);
    const body = safeJson(request.postData() || '{}', {}) as { content?: string };
    const comment: PostComment = { id: `comment-${Date.now()}`, postId, authorId: state.user.uid, content: body.content || '', createdAt: now };
    state.comments[postId] = [...(state.comments[postId] || []), comment];
    const post = state.posts.find((item) => item.id === postId);
    if (post) post.commentCount = state.comments[postId].length;
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
    if (notification) notification.isRead = true;
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
    const [, value = ''] = part.split(/\r?\n\r?\n/);
    fields[name] = value.replace(/\r?\n--$/, '').replace(/\r?\n$/, '').trim();
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

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));
}
