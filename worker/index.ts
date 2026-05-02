/// <reference types="@cloudflare/workers-types" />

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
  createdAt: string;
}

const SESSION_COOKIE = 'cpp_session';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

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

  if (path === '/health') return json({ ok: true, service: 'caixinha-pet-place', time: now() });
  if (path === '/push/vapid-public-key') return json({ publicKey: env.VAPID_PUBLIC_KEY || '' });

  if (path === '/auth/google/start' && method === 'GET') return googleStart(request, env);
  if (path === '/auth/google/callback' && method === 'GET') return googleCallback(request, env);
  if (path === '/auth/logout' && method === 'POST') return logout(env);

  const user = await requireUser(request, env);

  if (path === '/auth/me' && method === 'GET') return json({ user });
  if (path === '/media' && method === 'GET') return bad('Caminho de mídia ausente.', 400);
  if (path.startsWith('/media/') && method === 'GET') return serveMedia(path.slice('/media/'.length), request, env, user);

  if (path === '/config' && method === 'GET') return json({ config: await getConfig(env) });
  if (path === '/config' && method === 'PUT') {
    requireAdmin(user);
    return json({ config: await updateConfig(env, await request.json()) });
  }

  if (path === '/users' && method === 'GET') {
    requireAdmin(user);
    return json({ users: await listUsers(env) });
  }
  if (path === '/public-profiles' && method === 'GET') return json({ profiles: await listPublicProfiles(env) });
  if (path.match(/^\/users\/[^/]+$/) && method === 'PATCH') return updateUserRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/users\/[^/]+$/) && method === 'DELETE') {
    requireAdmin(user);
    await deleteUser(env, path.split('/')[2]);
    return json({ ok: true });
  }

  if (path === '/payments/ensure-current-month' && method === 'POST') return ensureCurrentMonthPaymentRoute(request, env, user);
  if (path === '/payments' && method === 'GET') return listPaymentsRoute(url, env, user);
  if (path === '/payments/charges' && method === 'POST') {
    requireAdmin(user);
    return createChargesRoute(request, env);
  }
  if (path === '/payments/donation' && method === 'POST') return submitDonationRoute(request, env, user);
  if (path.match(/^\/payments\/[^/]+\/proof$/) && method === 'POST') return uploadProofRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/payments\/[^/]+\/status$/) && method === 'PATCH') {
    requireAdmin(user);
    return updatePaymentStatusRoute(request, env, path.split('/')[2]);
  }
  if (path.match(/^\/payments\/[^/]+$/) && method === 'DELETE') return deletePaymentRoute(env, user, path.split('/')[2]);

  if (path === '/expenses' && method === 'GET') return json({ expenses: await listExpenses(env) });
  if (path === '/expenses' && method === 'POST') {
    requireAdmin(user);
    return addExpenseRoute(request, env, user);
  }

  if (path === '/pets' && method === 'GET') return json({ pets: await listPets(env, url.searchParams.get('ownerId') || undefined) });
  if (path === '/pets' && method === 'POST') return addPetRoute(request, env, user);
  if (path.match(/^\/pets\/[^/]+$/) && method === 'PATCH') return updatePetRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/pets\/[^/]+$/) && method === 'DELETE') return deletePetRoute(env, user, path.split('/')[2]);

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
    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(path.split('/')[2]).run();
    return json({ ok: true });
  }
  if (path === '/notify-now' && method === 'POST') {
    requireAdmin(user);
    const body = await request.json<{ eventId: string }>();
    ctx.waitUntil(processImmediateNotification(env, body.eventId));
    return json({ ok: true });
  }

  if (path === '/notifications' && method === 'GET') return json({ notifications: await listNotifications(env, user) });
  if (path === '/notifications/latest' && method === 'GET') return json({ notification: await latestNotification(env, user) });
  if (path === '/notifications' && method === 'POST') return addNotificationRoute(request, env, user);
  if (path.match(/^\/notifications\/[^/]+\/read$/) && method === 'PATCH') return markNotificationRead(env, user, path.split('/')[2]);

  if (path === '/posts' && method === 'GET') return json({ posts: await listPosts(env, Number(url.searchParams.get('limit') || 10)) });
  if (path === '/posts' && method === 'POST') return addPostRoute(request, env, user);
  if (path.match(/^\/posts\/[^/]+$/) && method === 'PATCH') return updatePostRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+$/) && method === 'DELETE') return deletePostRoute(env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+\/comments$/) && method === 'GET') return json({ comments: await listComments(env, path.split('/')[2]) });
  if (path.match(/^\/posts\/[^/]+\/comments$/) && method === 'POST') return addCommentRoute(request, env, user, path.split('/')[2]);
  if (path.match(/^\/comments\/[^/]+$/) && method === 'DELETE') return deleteCommentRoute(env, user, path.split('/')[2]);
  if (path.match(/^\/posts\/[^/]+\/toggle-like$/) && method === 'POST') return toggleLikeRoute(request, env, user, path.split('/')[2]);

  if (path === '/push-subscriptions' && method === 'POST') return savePushSubscriptionRoute(request, env, user);

  if (path === '/backup' && method === 'GET') {
    requireAdmin(user);
    return json(await backup(env));
  }
  if (path === '/backup/restore' && method === 'POST') {
    requireAdmin(user);
    return bad('Restauração pelo app foi desativada nesta versão. Use tools/migrate load para restaurações auditáveis.', 501);
  }

  return bad('Rota não encontrada.', 404);
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function bad(message: string, status = 400): Response {
  return json({ error: message }, status);
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
  const bootstrapEmail = (env.BOOTSTRAP_ADMIN_EMAIL || 'peritto@gmail.com').toLowerCase();
  const role: Role = info.email.toLowerCase() === bootstrapEmail ? 'admin' : 'resident';
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
    createdAt: row.created_at,
  };
}

async function listUsers(env: Env): Promise<CurrentUser[]> {
  const rows = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all<any>();
  return (rows.results || []).map(rowToUser);
}

async function listPublicProfiles(env: Env): Promise<CurrentUser[]> {
  const rows = await env.DB.prepare(`
    SELECT id, name, '' phone, dog_name, photo_key, photo_url, role, email, family_id, user_status, created_at
    FROM users
    WHERE user_status != 'blocked'
    ORDER BY name COLLATE NOCASE
  `).all<any>();
  return (rows.results || []).map(rowToUser);
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
  return json({ user: await getUser(env, userId) });
}

async function deleteUser(env: Env, userId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM pets WHERE owner_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM posts WHERE author_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM payments WHERE family_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}

async function getConfig(env: Env): Promise<any | null> {
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('config').first<any>();
  if (!row) return null;
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
  return json({ payment: (await listPayments(env, targetFamilyId)).find((p) => p.id === id) });
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
  return json({ ok: true });
}

async function updatePaymentStatusRoute(request: Request, env: Env, paymentId: string): Promise<Response> {
  const body = await request.json<{ status: PaymentStatus }>();
  if (!['pending', 'analyzing', 'approved', 'rejected'].includes(body.status)) return bad('Status inválido.', 400);
  await env.DB.prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, now(), paymentId).run();
  return json({ ok: true });
}

async function deletePaymentRoute(env: Env, user: CurrentUser, paymentId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<any>();
  if (!row) return json({ ok: true });
  if (user.role !== 'admin' && !(row.family_id === familyId(user) && row.status === 'pending')) throw new HttpError('Sem permissão para remover este pagamento.', 403);
  await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run();
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
  return json({ pet: (await listPets(env)).find((p) => p.id === petId) });
}

async function deletePetRoute(env: Env, user: CurrentUser, petId: string): Promise<Response> {
  const pet = await env.DB.prepare('SELECT * FROM pets WHERE id = ?').bind(petId).first<any>();
  if (pet && pet.owner_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para este pet.', 403);
  await env.DB.prepare('DELETE FROM pets WHERE id = ?').bind(petId).run();
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
  return (await listEvents(env)).find((event) => event.id === id);
}

async function markEventRead(env: Env, user: CurrentUser, eventId: string): Promise<Response> {
  await env.DB.prepare(`
    INSERT INTO event_reads (event_id, user_id, read_at)
    VALUES (?, ?, ?)
    ON CONFLICT(event_id, user_id) DO NOTHING
  `).bind(eventId, user.uid, now()).run();
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
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

async function addNotificationRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const data = await request.json<any>();
  if (user.role !== 'admin' && data.userId !== 'admins') throw new HttpError('Sem permissão para criar esta notificação.', 403);
  const notification = await insertNotification(env, data.userId, data.title, data.message || '');
  return json({ notification });
}

async function markNotificationRead(env: Env, user: CurrentUser, id: string): Promise<Response> {
  await env.DB.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE id = ? AND (user_id = ? OR user_id = 'all' OR (user_id = 'admins' AND ? = 'admin'))
  `).bind(id, user.uid, user.role).run();
  return json({ ok: true });
}

async function insertNotification(env: Env, userId: string, title: string, message: string): Promise<any> {
  const id = newId('notif');
  await env.DB.prepare(`
    INSERT INTO notifications (id, user_id, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).bind(id, userId, title, message, now()).run();
  await sendPushForTarget(env, userId);
  const row = await env.DB.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first<any>();
  return rowToNotification(row);
}

async function listPosts(env: Env, limit: number): Promise<any[]> {
  const res = await env.DB.prepare(`
    SELECT p.*,
      GROUP_CONCAT(DISTINCT pl.user_id) AS liked_by,
      GROUP_CONCAT(DISTINCT pt.user_id) AS tags
    FROM posts p
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
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
    mediaType: row.media_type || undefined,
    likedBy: row.liked_by ? String(row.liked_by).split(',') : [],
    tags: row.tags ? String(row.tags).split(',') : [],
    createdAt: row.created_at,
  };
}

async function addPostRoute(request: Request, env: Env, user: CurrentUser): Promise<Response> {
  const form = await request.formData();
  const data = parseFormJson<any>(form, 'data');
  if (data.authorId !== user.uid) throw new HttpError('Sem permissão para publicar por outro usuário.', 403);
  const file = form.get('media');
  const mediaKey = file instanceof File && file.size > 0 ? await putFile(env, 'posts', file) : null;
  const id = newId('post');
  await env.DB.prepare(`
    INSERT INTO posts (id, author_id, content, media_key, media_url, media_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.uid, data.content || '', mediaKey, mediaKey ? null : data.mediaUrl || null, data.mediaType || null, now()).run();
  if (Array.isArray(data.tags) && data.tags.length) {
    await env.DB.batch(data.tags.map((tag: string) => env.DB.prepare('INSERT OR IGNORE INTO post_tags (post_id, user_id) VALUES (?, ?)').bind(id, tag)));
  }
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
  return json({ ok: true });
}

async function deletePostRoute(env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<any>();
  if (post && post.author_id !== user.uid && user.role !== 'admin') throw new HttpError('Sem permissão para remover este post.', 403);
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
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
  const id = newId('comment');
  await env.DB.prepare(`
    INSERT INTO post_comments (id, post_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, postId, user.uid, data.content || '', now()).run();
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
  return json({ ok: true });
}

async function toggleLikeRoute(request: Request, env: Env, user: CurrentUser, postId: string): Promise<Response> {
  const body = await request.json<{ currentlyLiked: boolean }>();
  if (body.currentlyLiked) {
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.uid).run();
  } else {
    await env.DB.prepare('INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').bind(postId, user.uid, now()).run();
  }
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

async function serveMedia(key: string, _request: Request, env: Env, _user: CurrentUser): Promise<Response> {
  const object = await env.MEDIA.get(decodeURIComponent(key));
  if (!object) return bad('Mídia não encontrada.', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(object.body, { headers });
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
  const tables = ['users', 'settings', 'payments', 'expenses', 'pets', 'events', 'event_reads', 'notifications', 'posts', 'post_likes', 'post_tags', 'post_comments', 'push_subscriptions'];
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
    sub: env.VAPID_SUBJECT || 'mailto:peritto@gmail.com',
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
  return crypto.subtle.importKey('pkcs8', binary, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
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
