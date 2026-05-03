/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers';
import { commentNotification, likeNotification } from '../src/lib/notificationPolicy';

type Role = 'admin' | 'resident';
type PaymentStatus = 'pending' | 'analyzing' | 'approved' | 'rejected';

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  APP_URL: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  REALTIME: DurableObjectNamespace<RealtimeHub>;
}

interface SessionPayload {
  uid: string;
  exp: number;
}

interface CurrentUser {
  uid: string;
  name: string;
  phone: string;
  dogName: string;
  photoUrl: string;
  role: Role;
  email: string;
  familyId?: string;
  userStatus: 'pending' | 'active' | 'blocked';
  isOffline?: boolean;
  createdAt: string;
}

type RealtimeTarget = 'all' | 'admins' | string;

interface RealtimeEvent {
  topic: string;
  target: RealtimeTarget;
  payload?: Record<string, unknown>;
  createdAt: string;
}

const SESSION_COOKIE = 'cpp_session';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export class RealtimeHub extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/publish') && request.method === 'POST') {
      const event = await request.json<RealtimeEvent>();
      this.broadcast(event);
      return json({ ok: true });
    }

    if (request.headers.get('Upgrade') !== 'websocket') return bad('Upgrade websocket ausente.', 426);
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    if (!userId) return bad('Usuário ausente.', 401);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.serializeAttachment({ userId, role });
    this.ctx.acceptWebSocket(server, ['all', `user:${userId}`, role === 'admin' ? 'admins' : 'users']);
    server.send(JSON.stringify({ topic: 'realtime:ready', target: userId, createdAt: now() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (message === 'ping') ws.send('pong');
  }

  async webSocketClose() {
    // The hibernation API removes closed sockets from state automatically.
  }

  private broadcast(event: RealtimeEvent) {
    const tags = event.target === 'all'
      ? ['all']
      : event.target === 'admins'
        ? ['admins']
        : [`user:${event.target}`];
    const message = JSON.stringify(event);
    for (const tag of tags) {
      for (const ws of this.ctx.getWebSockets(tag)) {
        try {
          ws.send(message);
        } catch {
          try { ws.close(1011, 'send failed'); } catch {}
        }
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      if (url.pathname.startsWith('/api/')) return await routeApi(request, env, ctx);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      const status = error instanceof HttpError ? error.status : 500;
      return json({ error: error instanceof Error ? error.message : 'Erro desconhecido.' }, status);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(processScheduledEvents(env));
  },
};

async function routeApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;

  const publicResponse = await routePublicApi(path, method, request, env);
  if (publicResponse) return publicResponse;

  const user = await requireUser(request, env);
  const authenticatedResponse =
    await routeRealtimeApi(path, method, request, env, user) ||
    await routeSessionApi(path, method, user) ||
    await routeMediaApi(path, method, request, env, user) ||
    await routeConfigApi(path, method, request, env, user) ||
    await routeUsersApi(path, method, request, env, user) ||
    await routePaymentsApi(path, method, request, url, env, user) ||
    await routeExpensesApi(path, method, request, env, user) ||
    await routePetsApi(path, method, request, url, env, user) ||
    await routeEventsApi(path, method, request, env, ctx, user) ||
    await routeNotificationsApi(path, method, request, env, user) ||
    await routePostsApi(path, method, request, url, env, user) ||
    await routePushApi(path, method, request, env, user) ||
    await routeBackupApi(path, method, env, user);

  if (authenticatedResponse) return authenticatedResponse;
  return bad('Rota nao encontrada.', 404);
}

async function routeRealtimeApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path !== '/realtime' || method !== 'GET') return null;
  const headers = new Headers(request.headers);
  headers.set('x-user-id', user.uid);
  headers.set('x-user-role', user.role);
  const stub = env.REALTIME.get(env.REALTIME.idFromName('global'));
  return stub.fetch(new Request(request, { headers }));
}

async function routePublicApi(path: string, method: string, request: Request, env: Env): Promise<Response | null> {
  if (path === '/health') return json({ ok: true, service: 'pet-place', time: now() });
  if (path === '/push/vapid-public-key') return json({ publicKey: env.VAPID_PUBLIC_KEY || '' });
  if (path === '/auth/google/start' && method === 'GET') return googleStart(request, env);
  if (path === '/auth/google/callback' && method === 'GET') return googleCallback(request, env);
  if (path === '/auth/logout' && method === 'POST') return logout(env);
  return null;
}

async function routeSessionApi(path: string, method: string, user: CurrentUser): Promise<Response | null> {
  if (path === '/auth/me' && method === 'GET') return json({ user });
  return null;
}

async function routeMediaApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/media' && method === 'GET') return bad('Caminho de media ausente.', 400);
  if (path.startsWith('/media/') && method === 'GET') return serveMedia(path.slice('/media/'.length), request, env, user);
  return null;
}

async function routeConfigApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/config' && method === 'GET') return json({ config: await getConfig(env) });
  if (path === '/config' && method === 'PUT') {
    requireAdmin(user);
    return json({ config: await updateConfig(env, await request.json()) });
  }
  return null;
}

async function routeUsersApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/users' && method === 'GET') {
    requireAdmin(user);
    return json({ users: await listUsers(env) });
  }
  if (path === '/users/offline' && method === 'POST') {
    requireAdmin(user);
    return createOfflineUserRoute(request, env);
  }
  if (path === '/identity-link-suggestions' && method === 'GET') {
    requireAdmin(user);
    return json({ suggestions: await listIdentityLinkSuggestions(env) });
  }
  if (path.match(/^\/identity-link-suggestions\/[^/]+$/) && method === 'PATCH') {
    requireAdmin(user);
    return updateIdentityLinkSuggestionRoute(request, env, user, path.split('/')[2]);
  }
  if (path === '/public-profiles' && method === 'GET') return json({ profiles: await listPublicProfiles(env) });
  if (path.match(/^\/users\/[^/]+$/) && method === 'PATCH') return updateUserRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/users\/[^/]+$/) && method === 'DELETE') {
    requireAdmin(user);
    await deleteUser(env, path.split('/')[2]);
    return json({ ok: true });
  }
  return null;
}

async function routePaymentsApi(path: string, method: string, request: Request, url: URL, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/payments/ensure-current-month' && method === 'POST') return ensureCurrentMonthPaymentRoute(request, env, user);
  if (path === '/payments' && method === 'GET') return listPaymentsRoute(url, env, user);
  if (path === '/payments/charges' && method === 'POST') {
    requireAdmin(user);
    return createChargesRoute(request, env);
  }
  if (path === '/payments/manual' && method === 'POST') {
    requireAdmin(user);
    return createManualPaymentRoute(request, env, user);
  }
  if (path === '/payments/donation' && method === 'POST') return submitDonationRoute(request, env, user);
  if (path.match(/^\/payments\/[^/]+\/proof$/) && method === 'POST') return uploadProofRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/payments\/[^/]+\/status$/) && method === 'PATCH') {
    requireAdmin(user);
    return updatePaymentStatusRoute(request, env, path.split('/')[2]);
  }
  if (path.match(/^\/payments\/[^/]+$/) && method === 'DELETE') return deletePaymentRoute(env, user, path.split('/')[2]);
  return null;
}

async function routeExpensesApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/expenses' && method === 'GET') return json({ expenses: await listExpenses(env) });
  if (path === '/expenses' && method === 'POST') {
    requireAdmin(user);
    return addExpenseRoute(request, env, user);
  }
  return null;
}

async function routePetsApi(path: string, method: string, request: Request, url: URL, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/pets' && method === 'GET') return json({ pets: await listPets(env, url.searchParams.get('ownerId') || undefined) });
  if (path === '/pets' && method === 'POST') return addPetRoute(request, env, user);
  if (path.match(/^\/pets\/[^/]+$/) && method === 'PATCH') return updatePetRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/pets\/[^/]+$/) && method === 'DELETE') return deletePetRoute(env, user, path.split('/')[2]);
  return null;
}

async function routeEventsApi(path: string, method: string, request: Request, env: Env, ctx: ExecutionContext, user: CurrentUser): Promise<Response | null> {
  if (path === '/events' && method === 'GET') return json({ events: await listEvents(env) });
  if (path === '/events' && method === 'POST') {
    requireAdmin(user);
    const event = await addEvent(env, user, await request.json());
    if (event.notifyNow) ctx.waitUntil(processImmediateNotification(env, event.id));
    return json({ event });
  }
  if (path.match(/^\/events\/[^/]+\/read$/) && method === 'POST') return markEventRead(env, user, path.split('/')[2]);
  if (path.match(/^\/events\/[^/]+$/) && method === 'DELETE') {
    requireAdmin(user);
    const eventId = path.split('/')[2];
    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run();
    await publishRealtime(env, 'events', 'all', { eventId, action: 'deleted' });
    return json({ ok: true });
  }
  if (path === '/notify-now' && method === 'POST') {
    requireAdmin(user);
    const body = await request.json<{ eventId: string }>();
    ctx.waitUntil(processImmediateNotification(env, body.eventId));
    return json({ ok: true });
  }
  return null;
}

async function routeNotificationsApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/notifications' && method === 'GET') return json({ notifications: await listNotifications(env, user) });
  if (path === '/notifications/latest' && method === 'GET') return json({ notification: await latestNotification(env, user) });
  if (path === '/notifications' && method === 'POST') return addNotificationRoute(request, env, user);
  if (path.match(/^\/notifications\/[^/]+\/read$/) && method === 'PATCH') return markNotificationRead(env, user, path.split('/')[2]);
  return null;
}

async function routePostsApi(path: string, method: string, request: Request, url: URL, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/posts' && method === 'GET') return json({ posts: await listPosts(env, Number(url.searchParams.get('limit') || 10)) });
  if (path === '/posts' && method === 'POST') return addPostRoute(request, env, user);
  if (path.match(/^\/posts\/[^/]+$/) && method === 'PATCH') return updatePostRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+$/) && method === 'DELETE') return deletePostRoute(env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+\/comments$/) && method === 'GET') return json({ comments: await listComments(env, path.split('/')[2]) });
  if (path.match(/^\/posts\/[^/]+\/comments$/) && method === 'POST') return addCommentRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/comments\/[^/]+$/) && method === 'DELETE') return deleteCommentRoute(env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+\/toggle-like$/) && method === 'POST') return toggleLikeRoute(request, env, user, path.split('/')[2]);
  return null;
}

async function routePushApi(path: string, method: string, request: Request, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/push-subscriptions' && method === 'POST') return savePushSubscriptionRoute(request, env, user);
  return null;
}

async function routeBackupApi(path: string, method: string, env: Env, user: CurrentUser): Promise<Response | null> {
  if (path === '/backup' && method === 'GET') {
    requireAdmin(user);
    return json(await backup(env));
  }
  if (path === '/backup/restore' && method === 'POST') {
    requireAdmin(user);
    return bad('Restauracao pelo app foi desativada nesta versao. Use tools/migrate load para restauracoes auditaveis.', 501);
  }
  return null;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function bad(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function publishRealtime(env: Env, topic: string, target: RealtimeTarget = 'all', payload: Record<string, unknown> = {}): Promise<void> {
  if (!env.REALTIME) return;
  try {
    const stub = env.REALTIME.get(env.REALTIME.idFromName('global'));
    await stub.fetch('https://realtime.internal/publish', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ topic, target, payload, createdAt: now() } satisfies RealtimeEvent),
    });
  } catch (error) {
    console.warn('Falha ao publicar evento realtime:', error);
  }
}

function now(): string {
  return new Date().toISOString();
}

function newId(prefix = ''): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

function bool(value: unknown): number {
  return value ? 1 : 0;
}

function mediaUrl(key?: string | null, fallback?: string | null): string {
  if (key) return `/api/media/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  return fallback || '';
}

function requireAdmin(user: CurrentUser): void {
  if (user.role !== 'admin') throw new HttpError('Ação restrita a administradores.', 403);
}

function isSelfOrAdmin(user: CurrentUser, id: string): boolean {
  return user.uid === id || user.role === 'admin';
}

function familyId(user: CurrentUser): string {
  return user.familyId || user.uid;
}

async function googleStart(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return bad('OAuth do Google não está configurado.', 500);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';
  const state = await signState(env, { returnTo, exp: Math.floor(Date.now() / 1000) + 600, nonce: newId() });
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${appUrl(env)}/api/auth/google/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  return Response.redirect(authUrl.toString(), 302);
}

async function googleCallback(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return bad('OAuth do Google não está configurado.', 500);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateToken = url.searchParams.get('state');
  if (!code || !stateToken) return bad('Callback OAuth inválido.', 400);
  const state = await verifyState(env, stateToken);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${appUrl(env)}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) return bad(`Falha no OAuth Google: ${await tokenResponse.text()}`, 401);
  const token = await tokenResponse.json<{ access_token: string }>();
  const infoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!infoResponse.ok) return bad('Não foi possível ler o perfil Google.', 401);
  const info = await infoResponse.json<{ sub: string; email: string; email_verified?: boolean; name?: string; picture?: string }>();
  if (!info.email || !info.email_verified) return bad('Use uma conta Google com email verificado.', 403);
  const user = await findOrCreateGoogleUser(env, info);
  const session = await signSession(env, { uid: user.uid, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 });
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(state.returnTo || '/', appUrl(env)).toString(),
      'Set-Cookie': `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}

function logout(_env: Env): Response {
  return json({ ok: true }, 200, {
    'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}

async function requireUser(request: Request, env: Env): Promise<CurrentUser> {
  const token = parseCookie(request.headers.get('Cookie') || '')[SESSION_COOKIE];
  if (!token) throw new HttpError('Sessão ausente.', 401);
  const session = await verifySession(env, token);
  const user = await getUser(env, session.uid);
  if (!user) throw new HttpError('Usuário não encontrado.', 401);
  if (user.userStatus === 'blocked') throw new HttpError('Usuário bloqueado.', 403);
  return user;
}

async function findOrCreateGoogleUser(env: Env, info: { sub: string; email: string; name?: string; picture?: string }): Promise<CurrentUser> {
  const bySub = await env.DB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(info.sub).first<any>();
  if (bySub) return rowToUser(bySub);
  const byEmail = await env.DB.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').bind(info.email).first<any>();
  if (byEmail) {
    await env.DB.prepare('UPDATE users SET google_sub = ?, updated_at = ? WHERE id = ?').bind(info.sub, now(), byEmail.id).run();
    return { ...rowToUser(byEmail), uid: byEmail.id };
  }
  const bootstrapEmail = (env.BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase();
  const role: Role = bootstrapEmail && info.email.toLowerCase() === bootstrapEmail ? 'admin' : 'resident';
  const status = role === 'admin' ? 'active' : 'pending';
  const userId = newId('usr');
  const createdAt = now();
  await env.DB.prepare(`
    INSERT INTO users (id, google_sub, name, phone, dog_name, photo_url, role, email, user_status, created_at, updated_at)
    VALUES (?, ?, ?, '', '', ?, ?, ?, ?, ?, ?)
  `).bind(userId, info.sub, info.name || 'Nova Pessoa', info.picture || '', role, info.email, status, createdAt, createdAt).run();
  if (role !== 'admin') {
    await insertNotification(env, 'admins', 'Novo Cadastro', `${info.name || info.email} se cadastrou no app e aguarda aprovação de acesso.`);
  }
  return (await getUser(env, userId))!;
}

async function getUser(env: Env, id: string): Promise<CurrentUser | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
  return row ? rowToUser(row) : null;
}

function rowToUser(row: any): CurrentUser {
  return {
    uid: row.id,
    name: row.name || '',
    phone: row.phone || '',
    dogName: row.dog_name || '',
    photoUrl: mediaUrl(row.photo_key, row.photo_url),
    role: row.role,
    email: row.email || '',
    ...(row.family_id ? { familyId: row.family_id } : {}),
    userStatus: row.user_status || 'pending',
    isOffline: !!row.is_offline,
    createdAt: row.created_at,
  };
}

async function listUsers(env: Env): Promise<CurrentUser[]> {
  const rows = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all<any>();
  return (rows.results || []).map(rowToUser);
}

async function listPublicProfiles(env: Env): Promise<CurrentUser[]> {
  const rows = await env.DB.prepare(`
    SELECT id, name, '' phone, dog_name, photo_key, photo_url, role, email, family_id, user_status, is_offline, created_at
    FROM users
    WHERE user_status != 'blocked'
    ORDER BY name COLLATE NOCASE
  `).all<any>();
  return (rows.results || []).map(rowToUser);
}

async function createOfflineUserRoute(request: Request, env: Env): Promise<Response> {
  const data = await request.json<{ name?: string; phone?: string; dogName?: string }>();
  const name = String(data.name || '').trim();
  const phone = normalizePhoneBR(data.phone);
  if (!name) return bad('Nome obrigatorio.', 400);
  if (!phone || phone.length < 10) return bad('Telefone brasileiro obrigatorio.', 400);

  const existing = await env.DB.prepare(`
    SELECT * FROM users
    WHERE phone = ? AND is_offline = 1 AND user_status != 'blocked'
    LIMIT 1
  `).bind(phone).first<any>();
  if (existing) return json({ user: rowToUser(existing), reused: true });

  const id = newId('offline');
  const timestamp = now();
  await env.DB.prepare(`
    INSERT INTO users (id, google_sub, name, phone, dog_name, photo_url, role, email, user_status, is_offline, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, '', 'resident', ?, 'active', 1, ?, ?)
  `).bind(id, name, phone, String(data.dogName || ''), `offline+${id}@pet-place.local`, timestamp, timestamp).run();

  await publishRealtime(env, 'users', 'admins', { userId: id, action: 'created' });
  await publishRealtime(env, 'profiles', 'all', { userId: id, action: 'created' });
  return json({ user: await getUser(env, id) }, 201);
}

async function updateUserRoute(request: Request, env: Env, user: CurrentUser, userId: string): Promise<Response> {
  if (!isSelfOrAdmin(user, userId)) throw new HttpError('Sem permissão para editar este perfil.', 403);
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  const existing = await getUser(env, userId);
  if (!existing) return bad('Usuário não encontrado.', 404);
  const role = user.role === 'admin' && data.role ? data.role : existing.role;
  const userStatus = user.role === 'admin' && data.userStatus ? data.userStatus : existing.userStatus;
  const family = data.familyId !== undefined ? data.familyId || null : existing.familyId || null;
  const photo = form.get('photo');
  let photoKey: string | null = null;
  let photoUrl = data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl;
  if (photo instanceof File && photo.size > 0) {
    photoKey = await putFile(env, 'users', photo);
    photoUrl = '';
  }
  await env.DB.prepare(`
    UPDATE users
    SET name = ?, phone = ?, dog_name = ?, role = ?, family_id = ?, user_status = ?,
        photo_key = COALESCE(?, photo_key), photo_url = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    data.name ?? existing.name,
    data.phone !== undefined ? normalizePhoneBR(data.phone) : existing.phone,
    data.dogName ?? existing.dogName,
    role,
    family,
    userStatus,
    photoKey,
    photoUrl && !photoUrl.startsWith('/api/media/') ? photoUrl : '',
    now(),
    userId,
  ).run();
  const updated = await getUser(env, userId);
  if (updated && !updated.isOffline && updated.phone && updated.phone !== existing.phone) {
    await createPhoneLinkSuggestions(env, updated);
  }
  await publishRealtime(env, 'users', user.role === 'admin' ? 'admins' : userId, { userId, action: 'updated' });
  await publishRealtime(env, 'profiles', 'all', { userId, action: 'updated' });
  return json({ user: updated });
}

async function createPhoneLinkSuggestions(env: Env, source: CurrentUser): Promise<void> {
  const rows = await env.DB.prepare(`
    SELECT * FROM users
    WHERE phone = ? AND is_offline = 1 AND user_status != 'blocked' AND id != ?
  `).bind(source.phone, source.uid).all<any>();
  const targets = rows.results || [];
  if (!targets.length) return;

  const timestamp = now();
  const statements = targets.map((target) => env.DB.prepare(`
    INSERT OR IGNORE INTO identity_link_suggestions (id, source_user_id, target_user_id, phone, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).bind(newId('link'), source.uid, target.id, source.phone, timestamp));
  await env.DB.batch(statements);
  await insertNotification(env, 'admins', 'Sugestao de vinculo', `${source.name} informou um telefone que bate com ${targets.length} cadastro(s) offline.`);
  await publishRealtime(env, 'identity-link-suggestions', 'admins', { sourceUserId: source.uid });
}

async function listIdentityLinkSuggestions(env: Env): Promise<any[]> {
  const rows = await env.DB.prepare(`
    SELECT s.*,
      source.name AS source_name,
      source.phone AS source_phone,
      target.name AS target_name,
      target.phone AS target_phone
    FROM identity_link_suggestions s
    JOIN users source ON source.id = s.source_user_id
    JOIN users target ON target.id = s.target_user_id
    ORDER BY s.created_at DESC
    LIMIT 100
  `).all<any>();
  return (rows.results || []).map((row) => ({
    id: row.id,
    sourceUserId: row.source_user_id,
    sourceName: row.source_name || '',
    sourcePhone: row.source_phone || '',
    targetUserId: row.target_user_id,
    targetName: row.target_name || '',
    targetPhone: row.target_phone || '',
    phone: row.phone || '',
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  }));
}

async function updateIdentityLinkSuggestionRoute(request: Request, env: Env, user: CurrentUser, suggestionId: string): Promise<Response> {
  const body = await request.json<{ status: 'approved' | 'rejected' }>();
  if (!['approved', 'rejected'].includes(body.status)) return bad('Status invalido.', 400);
  const suggestion = await env.DB.prepare('SELECT * FROM identity_link_suggestions WHERE id = ?').bind(suggestionId).first<any>();
  if (!suggestion) return bad('Sugestao nao encontrada.', 404);
  if (suggestion.status !== 'pending') return bad('Sugestao ja resolvida.', 409);

  if (body.status === 'approved') {
    const source = await getUser(env, suggestion.source_user_id);
    const target = await getUser(env, suggestion.target_user_id);
    if (!source || !target) return bad('Usuarios do vinculo nao encontrados.', 404);
    const sourceFamily = familyId(source);
    const targetFamily = familyId(target);
    const timestamp = now();
    await env.DB.batch([
      env.DB.prepare(`
        DELETE FROM payments
        WHERE type = 'mensalidade'
          AND status IN ('pending', 'rejected')
          AND family_id IN (?, ?)
          AND EXISTS (
            SELECT 1 FROM payments keeper
            WHERE keeper.type = 'mensalidade'
              AND keeper.month = payments.month
              AND keeper.family_id IN (?, ?)
              AND keeper.id != payments.id
              AND (
                keeper.status = 'approved'
                OR keeper.family_id = ?
              )
          )
      `).bind(sourceFamily, targetFamily, sourceFamily, targetFamily, sourceFamily),
      env.DB.prepare('UPDATE payments SET family_id = ?, updated_at = ? WHERE family_id = ?').bind(sourceFamily, timestamp, targetFamily),
      env.DB.prepare('UPDATE pets SET owner_id = ? WHERE owner_id = ?').bind(source.uid, target.uid),
      env.DB.prepare('UPDATE users SET dog_name = CASE WHEN dog_name = "" THEN ? ELSE dog_name END, updated_at = ? WHERE id = ?').bind(target.dogName || '', timestamp, source.uid),
      env.DB.prepare('UPDATE users SET user_status = "blocked", updated_at = ? WHERE id = ?').bind(timestamp, target.uid),
    ]);
    await env.DB.prepare(`
      DELETE FROM payments
      WHERE family_id = ?
        AND type = 'mensalidade'
        AND status IN ('pending', 'rejected')
        AND EXISTS (
          SELECT 1 FROM payments approved
          WHERE approved.family_id = payments.family_id
            AND approved.month = payments.month
            AND approved.type = 'mensalidade'
            AND approved.status = 'approved'
            AND approved.id != payments.id
        )
    `).bind(sourceFamily).run();
  }

  await env.DB.prepare(`
    UPDATE identity_link_suggestions
    SET status = ?, resolved_at = ?, resolved_by = ?
    WHERE id = ?
  `).bind(body.status, now(), user.uid, suggestionId).run();

  await publishRealtime(env, 'identity-link-suggestions', 'admins', { suggestionId, status: body.status });
  await publishRealtime(env, 'users', 'admins', { suggestionId, action: 'identity-link-resolved' });
  await publishRealtime(env, 'profiles', 'all', { suggestionId, action: 'identity-link-resolved' });
  await publishRealtime(env, 'payments', 'all', { suggestionId, action: 'identity-link-resolved' });
  await publishRealtime(env, 'pets', 'all', { suggestionId, action: 'identity-link-resolved' });
  return json({ ok: true });
}

async function deleteUser(env: Env, userId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM pets WHERE owner_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM posts WHERE author_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM payments WHERE family_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
  await publishRealtime(env, 'users', 'admins', { userId, action: 'deleted' });
  await publishRealtime(env, 'profiles', 'all', { userId, action: 'deleted' });
  await publishRealtime(env, 'pets', 'all', { userId, action: 'deleted' });
  await publishRealtime(env, 'posts', 'all', { userId, action: 'user-deleted' });
  await publishRealtime(env, 'payments', 'all', { userId, action: 'user-deleted' });
}

async function getConfig(env: Env): Promise<any | null> {
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('config').first<any>();
  if (!row) {
    return {
      pixKey: '',
      monthlyAmount: 30,
      dueDateDay: 10,
      paymentInstructions: '',
      updatedAt: now(),
    };
  }
  return {
    pixKey: row.pix_key,
    monthlyAmount: row.monthly_amount,
    dueDateDay: row.due_date_day,
    paymentInstructions: row.payment_instructions,
    updatedAt: row.updated_at,
  };
}

async function updateConfig(env: Env, data: any): Promise<any> {
  const existing = await getConfig(env);
  const updated = {
    pixKey: data.pixKey ?? existing?.pixKey ?? '',
    monthlyAmount: Number(data.monthlyAmount ?? existing?.monthlyAmount ?? 30),
    dueDateDay: Number(data.dueDateDay ?? existing?.dueDateDay ?? 10),
    paymentInstructions: data.paymentInstructions ?? existing?.paymentInstructions ?? '',
    updatedAt: now(),
  };
  await env.DB.prepare(`
    INSERT INTO settings (id, pix_key, monthly_amount, due_date_day, payment_instructions, updated_at)
    VALUES ('config', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      pix_key = excluded.pix_key,
      monthly_amount = excluded.monthly_amount,
      due_date_day = excluded.due_date_day,
      payment_instructions = excluded.payment_instructions,
      updated_at = excluded.updated_at
  `).bind(updated.pixKey, updated.monthlyAmount, updated.dueDateDay, updated.paymentInstructions, updated.updatedAt).run();
  await publishRealtime(env, 'config', 'all', { action: 'updated' });
  return updated;
}

async function ensureCurrentMonthPaymentRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const body = await request.json<{ familyId: string }>();
  const targetFamilyId = body.familyId || familyId(user);
  if (targetFamilyId !== familyId(user) && user.role !== 'admin') throw new HttpError('Sem permissão para esta família.', 403);
  const config = await getConfig(env);
  if (!config) return json({ ok: true, skipped: true });
  const month = new Date().toISOString().slice(0, 7);
  const existing = await env.DB.prepare(`
    SELECT id FROM payments
    WHERE family_id = ? AND month = ? AND (type IS NULL OR type = 'mensalidade')
  `).bind(targetFamilyId, month).first<any>();
  if (!existing) {
    const timestamp = now();
    await env.DB.prepare(`
      INSERT INTO payments (id, family_id, month, amount, proof_url, status, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', 'pending', 'mensalidade', ?, ?)
    `).bind(newId('pay'), targetFamilyId, month, config.monthlyAmount, timestamp, timestamp).run();
    await publishRealtime(env, 'payments', 'all', { familyId: targetFamilyId, month, action: 'created' });
  }
  return json({ ok: true });
}

async function listPaymentsRoute(url: URL, env: Env, user: CurrentUser): Promise<Response> {
  const all = url.searchParams.get('all') === '1';
  const requestedFamily = url.searchParams.get('familyId');
  if (all) {
    return json({ payments: await listPayments(env) });
  }
  const targetFamilyId = requestedFamily || familyId(user);
  if (targetFamilyId !== familyId(user) && user.role !== 'admin') throw new HttpError('Sem permissão para estes pagamentos.', 403);
  return json({ payments: await listPayments(env, targetFamilyId) });
}

async function listPayments(env: Env, onlyFamilyId?: string): Promise<any[]> {
  const sql = `
    SELECT p.*, u.name AS user_name, u.dog_name AS user_dog
    FROM payments p
    LEFT JOIN users u ON u.id = p.family_id
    ${onlyFamilyId ? 'WHERE p.family_id = ?' : ''}
    ORDER BY p.month DESC, p.created_at DESC
  `;
  const res = onlyFamilyId
    ? await env.DB.prepare(sql).bind(onlyFamilyId).all<any>()
    : await env.DB.prepare(sql).all<any>();
  return (res.results || []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    month: row.month,
    amount: row.amount,
    proofUrl: mediaUrl(row.proof_key, row.proof_url),
    status: row.status,
    type: row.type || undefined,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name || undefined,
    userDog: row.user_dog || undefined,
  }));
}

async function submitDonationRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return bad('Comprovante ausente.', 400);
  const targetFamilyId = String(form.get('familyId') || familyId(user));
  if (targetFamilyId !== familyId(user) && user.role !== 'admin') throw new HttpError('Sem permissão para esta família.', 403);
  const timestamp = now();
  const proofKey = await putFile(env, 'proofs', file);
  const id = newId('donation');
  await env.DB.prepare(`
    INSERT INTO payments (id, family_id, month, amount, proof_key, proof_url, status, type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '', 'analyzing', 'doacao', ?, ?)
  `).bind(id, targetFamilyId, timestamp.slice(0, 7), Number(form.get('amount') || 0), proofKey, timestamp, timestamp).run();
  await insertNotification(env, 'admins', 'Nova Doação', `Uma doação de R$ ${Number(form.get('amount') || 0).toFixed(2)} aguarda análise.`);
  await publishRealtime(env, 'payments', 'all', { paymentId: id, familyId: targetFamilyId, action: 'created' });
  return json({ payment: (await listPayments(env, targetFamilyId)).find((p) => p.id === id) });
}

async function createManualPaymentRoute(request: Request, env: Env, _user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return bad('Comprovante ausente.', 400);

  const familyIdValue = String(form.get('familyId') || '');
  const amount = Number(form.get('amount') || 0);
  const month = String(form.get('month') || now().slice(0, 7));
  const type = String(form.get('type') || 'mensalidade');
  const description = String(form.get('description') || '').trim() || null;
  if (!familyIdValue) return bad('Pessoa obrigatoria.', 400);
  if (!amount || amount <= 0) return bad('Valor invalido.', 400);
  if (!['mensalidade', 'doacao', 'rateio'].includes(type)) return bad('Tipo invalido.', 400);

  const timestamp = now();
  const proofKey = await putFile(env, 'proofs', file);
  let paymentId = newId(type === 'doacao' ? 'donation' : 'pay');

  if (type === 'mensalidade') {
    const existing = await env.DB.prepare(`
      SELECT id FROM payments
      WHERE family_id = ? AND month = ? AND type = 'mensalidade'
      ORDER BY created_at ASC
      LIMIT 1
    `).bind(familyIdValue, month).first<any>();
    if (existing) {
      paymentId = existing.id;
      await env.DB.prepare(`
        UPDATE payments
        SET amount = ?, proof_key = ?, proof_url = '', status = 'approved', description = ?, updated_at = ?
        WHERE id = ?
      `).bind(amount, proofKey, description, timestamp, paymentId).run();
      await publishRealtime(env, 'payments', 'all', { paymentId, familyId: familyIdValue, action: 'updated' });
      return json({ payment: (await listPayments(env, familyIdValue)).find((payment) => payment.id === paymentId) });
    }
  }

  await env.DB.prepare(`
    INSERT INTO payments (id, family_id, month, amount, proof_key, proof_url, status, type, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '', 'approved', ?, ?, ?, ?)
  `).bind(paymentId, familyIdValue, month, amount, proofKey, type, description, timestamp, timestamp).run();

  await publishRealtime(env, 'payments', 'all', { paymentId, familyId: familyIdValue, action: 'created' });
  return json({ payment: (await listPayments(env, familyIdValue)).find((payment) => payment.id === paymentId) }, 201);
}

async function uploadProofRoute(request: Request, env: Env, user: CurrentUser, paymentId: string): Promise<Response> {
  const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<any>();
  if (!payment) return bad('Pagamento não encontrado.', 404);
  if (payment.family_id !== familyId(user) && user.role !== 'admin') throw new HttpError('Sem permissão para este pagamento.', 403);
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return bad('Comprovante ausente.', 400);
  const key = await putFile(env, 'proofs', file);
  await env.DB.prepare('UPDATE payments SET proof_key = ?, proof_url = "", status = "analyzing", updated_at = ? WHERE id = ?')
    .bind(key, now(), paymentId).run();
  await insertNotification(env, 'admins', 'Comprovante Recebido', 'Um novo comprovante foi anexado e aguarda avaliação.');
  await publishRealtime(env, 'payments', 'all', { paymentId, familyId: payment.family_id, action: 'proof-uploaded' });
  return json({ ok: true });
}

async function updatePaymentStatusRoute(request: Request, env: Env, paymentId: string): Promise<Response> {
  const body = await request.json<{ status: PaymentStatus }>();
  if (!['pending', 'analyzing', 'approved', 'rejected'].includes(body.status)) return bad('Status inválido.', 400);
  await env.DB.prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, now(), paymentId).run();
  await publishRealtime(env, 'payments', 'all', { paymentId, status: body.status, action: 'status-updated' });
  return json({ ok: true });
}

async function deletePaymentRoute(env: Env, user: CurrentUser, paymentId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<any>();
  if (!row) return json({ ok: true });
  if (user.role !== 'admin' && !(row.family_id === familyId(user) && row.status === 'pending')) throw new HttpError('Sem permissão para remover este pagamento.', 403);
  await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run();
  await publishRealtime(env, 'payments', 'all', { paymentId, familyId: row.family_id, action: 'deleted' });
  return json({ ok: true });
}

async function createChargesRoute(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ charges: any[] }>();
  const timestamp = now();
  const statements = (body.charges || []).map((charge) => {
    const type = charge.type || 'mensalidade';
    const amount = Number(charge.amount || 0);
    const status = charge.status || 'pending';
    const description = charge.description || null;
    if (type === 'mensalidade') {
      return env.DB.prepare(`
        INSERT INTO payments (id, family_id, month, amount, proof_url, status, type, description, created_at, updated_at)
        SELECT ?, ?, ?, ?, '', ?, 'mensalidade', ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM payments
          WHERE family_id = ? AND month = ? AND type = 'mensalidade'
        )
      `).bind(
        newId('pay'),
        charge.familyId,
        charge.month,
        amount,
        status,
        description,
        timestamp,
        timestamp,
        charge.familyId,
        charge.month,
      );
    }
    return env.DB.prepare(`
      INSERT INTO payments (id, family_id, month, amount, proof_url, status, type, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
    `).bind(
      newId('pay'),
      charge.familyId,
      charge.month,
      amount,
      status,
      type,
      description,
      timestamp,
      timestamp,
    );
  });
  if (statements.length) await env.DB.batch(statements);
  await publishRealtime(env, 'payments', 'all', { action: 'charges-created', count: statements.length });
  return json({ ok: true });
}

async function listExpenses(env: Env): Promise<any[]> {
  const res = await env.DB.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all<any>();
  return (res.results || []).map((row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    category: row.category,
    amount: row.amount,
    receiptUrl: mediaUrl(row.receipt_key, row.receipt_url),
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

async function addExpenseRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  const file = form.get('file');
  if (!(file instanceof File)) return bad('Recibo ausente.', 400);
  const key = await putFile(env, 'receipts', file);
  const id = newId('exp');
  await env.DB.prepare(`
    INSERT INTO expenses (id, date, title, category, amount, receipt_key, receipt_url, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)
  `).bind(id, data.date, data.title, data.category, Number(data.amount || 0), key, user.uid, data.createdAt || now()).run();
  await publishRealtime(env, 'expenses', 'all', { expenseId: id, action: 'created' });
  return json({ expense: (await listExpenses(env)).find((e) => e.id === id) });
}

async function listPets(env: Env, ownerId?: string): Promise<any[]> {
  const sql = `SELECT * FROM pets ${ownerId ? 'WHERE owner_id = ?' : ''} ORDER BY name COLLATE NOCASE`;
  const res = ownerId ? await env.DB.prepare(sql).bind(ownerId).all<any>() : await env.DB.prepare(sql).all<any>();
  return (res.results || []).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    photoUrl: mediaUrl(row.photo_key, row.photo_url),
    breed: row.breed,
    createdAt: row.created_at,
  }));
}

async function addPetRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  if (data.ownerId !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para este pet.', 403);
  const file = form.get('photo');
  const photoKey = file instanceof File && file.size > 0 ? await putFile(env, 'pets', file) : null;
  const id = newId('pet');
  await env.DB.prepare(`
    INSERT INTO pets (id, owner_id, name, photo_key, photo_url, breed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.ownerId, data.name, photoKey, photoKey ? '' : data.photoUrl || '', data.breed || '', now()).run();
  await publishRealtime(env, 'pets', 'all', { petId: id, ownerId: data.ownerId, action: 'created' });
  return json({ pet: (await listPets(env)).find((p) => p.id === id) });
}

async function updatePetRoute(request: Request, env: Env, user: CurrentUser, petId: string): Promise<Response> {
  const pet = await env.DB.prepare('SELECT * FROM pets WHERE id = ?').bind(petId).first<any>();
  if (!pet) return bad('Pet não encontrado.', 404);
  if (pet.owner_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para este pet.', 403);
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  const file = form.get('photo');
  const photoKey = file instanceof File && file.size > 0 ? await putFile(env, 'pets', file) : null;
  await env.DB.prepare(`
    UPDATE pets SET name = ?, breed = ?, photo_key = COALESCE(?, photo_key), photo_url = ? WHERE id = ?
  `).bind(data.name ?? pet.name, data.breed ?? pet.breed, photoKey, photoKey ? '' : data.photoUrl ?? pet.photo_url ?? '', petId).run();
  await publishRealtime(env, 'pets', 'all', { petId, ownerId: pet.owner_id, action: 'updated' });
  return json({ pet: (await listPets(env)).find((p) => p.id === petId) });
}

async function deletePetRoute(env: Env, user: CurrentUser, petId: string): Promise<Response> {
  const pet = await env.DB.prepare('SELECT * FROM pets WHERE id = ?').bind(petId).first<any>();
  if (pet && pet.owner_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para este pet.', 403);
  await env.DB.prepare('DELETE FROM pets WHERE id = ?').bind(petId).run();
  await publishRealtime(env, 'pets', 'all', { petId, ownerId: pet?.owner_id, action: 'deleted' });
  return json({ ok: true });
}

async function listEvents(env: Env): Promise<any[]> {
  const res = await env.DB.prepare(`
    SELECT e.*, GROUP_CONCAT(er.user_id) AS read_by
    FROM events e
    LEFT JOIN event_reads er ON er.event_id = e.id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all<any>();
  return (res.results || []).map(rowToEvent);
}

function rowToEvent(row: any): any {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    type: row.type,
    notify24h: !!row.notify_24h,
    notify1h: !!row.notify_1h,
    notifyNow: !!row.notify_now,
    notified24h: !!row.notified_24h,
    notified1h: !!row.notified_1h,
    notifiedNow: !!row.notified_now,
    readBy: row.read_by ? String(row.read_by).split(',') : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function addEvent(env: Env, user: CurrentUser, data: any): Promise<any> {
  const id = newId('ev');
  await env.DB.prepare(`
    INSERT INTO events (id, title, description, date, time, type, notify_24h, notify_1h, notify_now, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.title,
    data.description || '',
    data.date || '',
    data.time || '',
    data.type || 'announcement',
    bool(data.notify24h),
    bool(data.notify1h),
    bool(data.notifyNow),
    user.uid,
    now(),
  ).run();
  await publishRealtime(env, 'events', 'all', { eventId: id, action: 'created' });
  return (await listEvents(env)).find((event) => event.id === id);
}

async function markEventRead(env: Env, user: CurrentUser, eventId: string): Promise<Response> {
  await env.DB.prepare(`
    INSERT INTO event_reads (event_id, user_id, read_at)
    VALUES (?, ?, ?)
    ON CONFLICT(event_id, user_id) DO NOTHING
  `).bind(eventId, user.uid, now()).run();
  await publishRealtime(env, 'events', 'all', { eventId, userId: user.uid, action: 'read' });
  return json({ ok: true });
}

async function listNotifications(env: Env, user: CurrentUser): Promise<any[]> {
  const targets = user.role === 'admin' ? [user.uid, 'all', 'admins'] : [user.uid, 'all'];
  const placeholders = targets.map(() => '?').join(',');
  const res = await env.DB.prepare(`
    SELECT * FROM notifications
    WHERE user_id IN (${placeholders})
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(...targets).all<any>();
  return (res.results || []).map(rowToNotification);
}

async function latestNotification(env: Env, user: CurrentUser): Promise<any | null> {
  return (await listNotifications(env, user))[0] || null;
}

function rowToNotification(row: any): any {
  let data: Record<string, unknown> | undefined;
  try {
    data = row.data_json ? JSON.parse(row.data_json) : undefined;
  } catch {
    data = undefined;
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: !!row.is_read,
    createdAt: row.created_at,
    type: row.type || 'generic',
    actorId: row.actor_id || undefined,
    entityType: row.entity_type || undefined,
    entityId: row.entity_id || undefined,
    aggregationKey: row.aggregation_key || undefined,
    count: row.count || 1,
    data,
  };
}

async function addNotificationRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const data = await request.json<any>();
  if (user.role !== 'admin' && data.userId !== 'admins') throw new HttpError('Sem permissão para criar esta notificação.', 403);
  const notification = await insertNotification(env, data.userId, data.title, data.message || '', { type: data.type || 'generic' });
  return json({ notification });
}

async function markNotificationRead(env: Env, user: CurrentUser, id: string): Promise<Response> {
  await env.DB.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE id = ? AND (user_id = ? OR user_id = 'all' OR (user_id = 'admins' AND ? = 'admin'))
  `).bind(id, user.uid, user.role).run();
  await publishRealtime(env, 'notifications', user.uid, { id, action: 'read' });
  return json({ ok: true });
}

interface InsertNotificationOptions {
  type?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  aggregationKey?: string;
  count?: number;
  data?: Record<string, unknown>;
  push?: boolean;
}

async function insertNotification(env: Env, userId: string, title: string, message: string, options: InsertNotificationOptions = {}): Promise<any> {
  const id = newId('notif');
  const timestamp = now();
  await env.DB.prepare(`
    INSERT INTO notifications (
      id, user_id, title, message, is_read, created_at, type, actor_id,
      entity_type, entity_id, aggregation_key, count, data_json, updated_at
    )
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    title,
    message,
    timestamp,
    options.type || 'generic',
    options.actorId || null,
    options.entityType || null,
    options.entityId || null,
    options.aggregationKey || null,
    options.count || 1,
    options.data ? JSON.stringify(options.data) : null,
    timestamp,
  ).run();
  if (options.push !== false) await sendPushForTarget(env, userId);
  const row = await env.DB.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first<any>();
  const notification = rowToNotification(row);
  await publishRealtime(env, 'notifications', userId, { id: notification.id, type: notification.type });
  return notification;
}

async function upsertLikeNotification(env: Env, post: any, actor: CurrentUser): Promise<void> {
  if (!post || post.author_id === actor.uid) return;
  const aggregationKey = `post_like:${post.id}`;
  const existing = await env.DB.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? AND aggregation_key = ? AND is_read = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(post.author_id, aggregationKey).first<any>();
  const likeCount = await countPostLikes(env, post.id);
  const copy = likeNotification({ actorName: actor.name, count: existing ? Math.max(likeCount, (existing.count || 1) + 1) : 1 });

  if (!existing) {
    await insertNotification(env, post.author_id, copy.title, copy.message, {
      type: copy.type,
      actorId: actor.uid,
      entityType: 'post',
      entityId: post.id,
      aggregationKey,
      count: 1,
      data: { postId: post.id },
    });
    return;
  }

  await env.DB.prepare(`
    UPDATE notifications
    SET title = ?, message = ?, actor_id = ?, count = ?, updated_at = ?
    WHERE id = ?
  `).bind(copy.title, copy.message, actor.uid, Math.max(likeCount, (existing.count || 1) + 1), now(), existing.id).run();
  await publishRealtime(env, 'notifications', post.author_id, { id: existing.id, type: copy.type });
}

async function countPostLikes(env: Env, postId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM post_likes WHERE post_id = ?').bind(postId).first<any>();
  return Number(row?.count || 0);
}

async function listPosts(env: Env, limit: number): Promise<any[]> {
  const res = await env.DB.prepare(`
    SELECT p.*,
      GROUP_CONCAT(DISTINCT pl.user_id) AS liked_by,
      GROUP_CONCAT(DISTINCT pt.user_id) AS tags,
      COUNT(DISTINCT pc.id) AS comment_count
    FROM posts p
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN post_comments pc ON pc.post_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ?
  `).bind(Math.max(1, Math.min(limit || 10, 100))).all<any>();
  return (res.results || []).map(rowToPost);
}

function rowToPost(row: any): any {
  return {
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    mediaUrl: mediaUrl(row.media_key, row.media_url),
    posterUrl: mediaUrl(row.poster_key, row.poster_url),
    mediaType: row.media_type || undefined,
    likedBy: row.liked_by ? String(row.liked_by).split(',') : [],
    tags: row.tags ? String(row.tags).split(',') : [],
    commentCount: Number(row.comment_count || 0),
    createdAt: row.created_at,
  };
}

async function addPostRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  if (data.authorId !== user.uid) throw new HttpError('Sem permissão para publicar por outro usuário.', 403);
  const file = form.get('media');
  const poster = form.get('poster');
  const mediaKey = file instanceof File && file.size > 0 ? await putFile(env, 'posts', file) : null;
  const posterKey = poster instanceof File && poster.size > 0 ? await putFile(env, 'posters', poster) : null;
  const id = newId('post');
  await env.DB.prepare(`
    INSERT INTO posts (id, author_id, content, media_key, media_url, media_type, poster_key, poster_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.uid, data.content || '', mediaKey, mediaKey ? null : data.mediaUrl || null, data.mediaType || null, posterKey, null, now()).run();
  if (Array.isArray(data.tags) && data.tags.length) {
    await env.DB.batch(data.tags.map((tag: string) => env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, user_id) VALUES (?, ?)').bind(id, tag)));
  }
  await publishRealtime(env, 'posts', 'all', { postId: id, action: 'created' });
  return json({ post: (await listPosts(env, 1)).find((p) => p.id === id), id });
}

async function updatePostRoute(request: Request, env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
  if (!post) return bad('Post não encontrado.', 404);
  if (post.author_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para editar este post.', 403);
  const data = await request.json<any>();
  await env.DB.batch([
    env.DB.prepare('UPDATE posts SET content = ? WHERE id = ?').bind(data.content || '', postId),
    env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId),
    ...(Array.isArray(data.tags) ? data.tags.map((tag: string) => env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, user_id) VALUES (?, ?)').bind(postId, tag)) : []),
  ]);
  await publishRealtime(env, 'posts', 'all', { postId, action: 'updated' });
  return json({ ok: true });
}

async function deletePostRoute(env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
  if (post && post.author_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para remover este post.', 403);
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
  await publishRealtime(env, 'posts', 'all', { postId, action: 'deleted' });
  return json({ ok: true });
}

async function listComments(env: Env, postId: string): Promise<any[]> {
  const res = await env.DB.prepare('SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC').bind(postId).all<any>();
  return (res.results || []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  }));
}

async function addCommentRoute(request: Request, env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const data = await request.json<any>();
  if (data.authorId !== user.uid) throw new HttpError('Sem permissão para comentar por outro usuário.', 403);
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
  if (!post) return bad('Post não encontrado.', 404);
  const id = newId('comment');
  await env.DB.prepare(`
    INSERT INTO post_comments (id, post_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, postId, user.uid, data.content || '', now()).run();
  if (post.author_id !== user.uid) {
    const copy = commentNotification({ actorName: user.name });
    await insertNotification(env, post.author_id, copy.title, copy.message, {
      type: copy.type,
      actorId: user.uid,
      entityType: 'post',
      entityId: postId,
      data: { postId, commentId: id },
    });
  }
  await publishRealtime(env, `comments:${postId}`, 'all', { postId, commentId: id, action: 'created' });
  await publishRealtime(env, 'posts', 'all', { postId, action: 'commented' });
  return json({ comment: (await listComments(env, postId)).find((c) => c.id === id) });
}

async function deleteCommentRoute(env: Env, user: CurrentUser, commentId: string): Promise<Response> {
  const comment = await env.DB.prepare(`
    SELECT c.*, p.author_id AS post_author_id
    FROM post_comments c
    LEFT JOIN posts p ON p.id = c.post_id
    WHERE c.id = ?
  `).bind(commentId).first<any>();
  if (comment && comment.author_id !== user.uid && comment.post_author_id !== user.uid && user.role !== 'admin') {
    throw new HttpError('Sem permissão para remover este comentário.', 403);
  }
  await env.DB.prepare('DELETE FROM post_comments WHERE id = ?').bind(commentId).run();
  if (comment?.post_id) {
    await publishRealtime(env, `comments:${comment.post_id}`, 'all', { postId: comment.post_id, commentId, action: 'deleted' });
    await publishRealtime(env, 'posts', 'all', { postId: comment.post_id, commentId, action: 'comment-deleted' });
  }
  return json({ ok: true });
}

async function toggleLikeRoute(request: Request, env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const body = await request.json<{ currentlyLiked: boolean }>();
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
  if (!post) return bad('Post não encontrado.', 404);
  if (body.currentlyLiked) {
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.uid).run();
  } else {
    const existing = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.uid).first<any>();
    await env.DB.prepare('INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').bind(postId, user.uid, now()).run();
    if (!existing) await upsertLikeNotification(env, post, user);
  }
  await publishRealtime(env, 'posts', 'all', { postId, action: body.currentlyLiked ? 'unliked' : 'liked' });
  return json({ ok: true });
}

async function savePushSubscriptionRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const body = await request.json<any>();
  const subscription = body.subscription || body;
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!endpoint || !p256dh || !auth) return bad('Push subscription inválida.', 400);
  const timestamp = now();
  await env.DB.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at
  `).bind(newId('push'), user.uid, endpoint, p256dh, auth, request.headers.get('User-Agent') || '', timestamp, timestamp).run();
  return json({ ok: true });
}

async function serveMedia(key: string, request: Request, env: Env, _user: CurrentUser): Promise<Response> {
  const decodedKey = decodeURIComponent(key);
  const rangeHeader = request.headers.get('Range');
  const head = await env.MEDIA.head(decodedKey);
  if (!head) return bad('Mídia não encontrada.', 404);

  const parsedRange = rangeHeader ? parseByteRange(rangeHeader, head.size) : null;
  if (rangeHeader && !parsedRange) {
    return new Response(null, {
      status: 416,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${head.size}`,
      },
    });
  }

  const object = await env.MEDIA.get(decodedKey, parsedRange ? { range: parsedRange } : undefined);
  if (!object) return bad('Mídia não encontrada.', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', inferContentType(decodedKey));
  headers.set('etag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('Content-Disposition', 'inline');
  if (parsedRange && object.range) {
    const range = normalizeR2Range(object.range, object.size);
    headers.set('Content-Range', `bytes ${range.offset}-${range.end}/${object.size}`);
    headers.set('Content-Length', String(range.length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
}

function parseByteRange(header: string, objectSize: number): R2Range | null {
  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) return null;

  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    return { suffix: Math.min(suffix, objectSize) };
  }

  const start = Number(startRaw);
  const end = endRaw ? Number(endRaw) : objectSize - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= objectSize) return null;
  return { offset: start, length: Math.min(end, objectSize - 1) - start + 1 };
}

function normalizeR2Range(range: R2Range, objectSize: number): { offset: number; end: number; length: number } {
  if ('suffix' in range) {
    const length = Math.min(range.suffix, objectSize);
    const offset = Math.max(objectSize - length, 0);
    return { offset, end: objectSize - 1, length };
  }
  const offset = range.offset || 0;
  const length = range.length || Math.max(objectSize - offset, 0);
  return { offset, end: Math.min(offset + length - 1, objectSize - 1), length };
}

function inferContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

async function putFile(env: Env, folder: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'file';
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return key;
}

async function processImmediateNotification(env: Env, eventId: string): Promise<void> {
  const row = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first<any>();
  if (!row || row.notified_now) return;
  const title = `${row.type === 'event' ? '📢' : '📌'} ${row.title}`;
  await insertNotification(env, 'all', title, row.description || '');
  await env.DB.prepare('UPDATE events SET notified_now = 1 WHERE id = ?').bind(eventId).run();
}

async function processScheduledEvents(env: Env): Promise<void> {
  const rows = await env.DB.prepare('SELECT * FROM events WHERE type = "event"').all<any>();
  const current = new Date();
  for (const row of rows.results || []) {
    if (!row.date) continue;
    const eventTime = new Date(`${row.date}T${row.time || '00:00'}:00`);
    if (Number.isNaN(eventTime.getTime())) continue;
    const diffHours = (eventTime.getTime() - current.getTime()) / 36e5;
    if (row.notify_24h && !row.notified_24h && diffHours <= 24 && diffHours > 0) {
      await insertNotification(env, 'all', `Lembrete: amanhã tem "${row.title}"`, row.description || 'Confira os detalhes no mural.');
      await env.DB.prepare('UPDATE events SET notified_24h = 1 WHERE id = ?').bind(row.id).run();
    }
    if (row.notify_1h && !row.notified_1h && diffHours <= 1 && diffHours > 0) {
      await insertNotification(env, 'all', `Daqui a 1 hora: "${row.title}"`, row.description || 'Confira os detalhes no mural.');
      await env.DB.prepare('UPDATE events SET notified_1h = 1 WHERE id = ?').bind(row.id).run();
    }
  }
}

async function sendPushForTarget(env: Env, target: string): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const sql = target === 'all'
    ? 'SELECT * FROM push_subscriptions'
    : target === 'admins'
      ? 'SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE u.role = "admin"'
      : 'SELECT * FROM push_subscriptions WHERE user_id = ?';
  const result = target === 'all' || target === 'admins'
    ? await env.DB.prepare(sql).all<any>()
    : await env.DB.prepare(sql).bind(target).all<any>();
  await Promise.all((result.results || []).map((row) => sendWebPush(env, row)));
}

async function sendWebPush(env: Env, row: any): Promise<void> {
  try {
    const aud = new URL(row.endpoint).origin;
    const jwt = await signVapidJwt(env, aud);
    const response = await fetch(row.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      },
    });
    if (response.status === 404 || response.status === 410) {
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
    }
  } catch (error) {
    console.warn('Falha ao enviar Web Push:', error);
  }
}

async function backup(env: Env): Promise<Record<string, unknown[]>> {
  const tables = ['users', 'settings', 'payments', 'expenses', 'pets', 'events', 'event_reads', 'notifications', 'posts', 'post_likes', 'post_tags', 'post_comments', 'push_subscriptions', 'identity_link_suggestions'];
  const out: Record<string, unknown[]> = {};
  for (const table of tables) {
    const res = await env.DB.prepare(`SELECT * FROM ${table}`).all();
    out[table] = res.results || [];
  }
  return out;
}

function parseFormJson<T>(form: FormData, key: string): T {
  const raw = form.get(key);
  if (!raw || typeof raw !== 'string') return {} as T;
  return JSON.parse(raw) as T;
}

function parseCookie(header: string): Record<string, string> {
  return Object.fromEntries(header.split(';').map((part) => {
    const [key, ...rest] = part.trim().split('=');
    return [key, rest.join('=')];
  }).filter(([key]) => key));
}

function appUrl(env: Env): string {
  return (env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function signSession(env: Env, payload: SessionPayload): Promise<string> {
  return signToken(env.SESSION_SECRET, payload);
}

async function verifySession(env: Env, token: string): Promise<SessionPayload> {
  const payload = await verifyToken<SessionPayload>(env.SESSION_SECRET, token);
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new HttpError('Sessão expirada.', 401);
  return payload;
}

async function signState(env: Env, payload: any): Promise<string> {
  return signToken(env.SESSION_SECRET, payload);
}

async function verifyState(env: Env, token: string): Promise<any> {
  const payload = await verifyToken<any>(env.SESSION_SECRET, token);
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new HttpError('Estado OAuth expirado.', 401);
  return payload;
}

async function signToken(secret: string, payload: unknown): Promise<string> {
  const body = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

async function verifyToken<T>(secret: string, token: string): Promise<T> {
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new HttpError('Token inválido.', 401);
  const expected = await hmac(secret, body);
  if (sig !== expected) throw new HttpError('Assinatura inválida.', 401);
  return JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as T;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64urlEncode(new Uint8Array(sig));
}

async function signVapidJwt(env: Env, aud: string): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || appUrl(env),
  })));
  const key = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY || '');
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64urlEncode(derToJose(new Uint8Array(sig)))}`;
}

async function importVapidPrivateKey(privateKey: string): Promise<CryptoKey> {
  const trimmed = privateKey.trim();
  const binary = trimmed.includes('BEGIN PRIVATE KEY')
    ? Uint8Array.from(atob(trimmed.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0))
    : base64urlDecode(trimmed);
  return crypto.subtle.importKey('pkcs8', toArrayBuffer(binary), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function derToJose(sig: Uint8Array): Uint8Array {
  if (sig.length === 64) return sig;
  let offset = 3;
  let rLen = sig[offset++];
  let r = sig.slice(offset, offset + rLen);
  offset += rLen + 1;
  let sLen = sig[offset - 1];
  let s = sig.slice(offset, offset + sLen);
  if (r[0] === 0) r = r.slice(1);
  if (s[0] === 0) s = s.slice(1);
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
}

function normalizePhoneBR(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if ((digits.length === 13 || digits.length === 12) && digits.startsWith('55')) return digits.slice(2);
  return digits.slice(0, 11);
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
