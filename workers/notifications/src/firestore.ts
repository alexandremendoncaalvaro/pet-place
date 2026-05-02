/**
 * firestore.ts — Cliente REST minimalista para Firestore.
 * Usa fetch() nativo — sem SDK, sem dependências.
 */

import type { Env } from './auth';

/** Constrói a URL base do Firestore REST API. */
function firestoreBaseUrl(env: Env): string {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${env.FIRESTORE_DATABASE_ID}/documents`;
}

// ---------------------------------------------------------------------------
// Tipos auxiliares para o Firestore REST response
// ---------------------------------------------------------------------------

interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields: Record<string, FirestoreValue> };
  nullValue?: null;
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
}

interface FirestoreRunQueryResponse {
  document?: FirestoreDocument;
  readTime?: string;
}

// ---------------------------------------------------------------------------
// Helpers: converter Firestore REST → JS
// ---------------------------------------------------------------------------

function parseValue(val: FirestoreValue): unknown {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.nullValue !== undefined) return null;
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map(parseValue);
  }
  if (val.mapValue) {
    return parseFields(val.mapValue.fields);
  }
  return null;
}

function parseFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseValue(val);
  }
  return result;
}

function extractDocId(docName: string): string {
  // name = "projects/.../documents/events/ABC123"
  const parts = docName.split('/');
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Helpers: converter JS → Firestore REST value
// ---------------------------------------------------------------------------

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// ---------------------------------------------------------------------------
// Exported interface: Event from Firestore
// ---------------------------------------------------------------------------

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: string;
  notify24h?: boolean;
  notify1h?: boolean;
  notifyNow?: boolean;
  notified24h?: boolean;
  notified1h?: boolean;
  notifiedNow?: boolean;
  readBy?: string[];
  createdBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Query: buscar todos os eventos
// ---------------------------------------------------------------------------

export async function queryEvents(accessToken: string, env: Env): Promise<FirestoreEvent[]> {
  const url = `${firestoreBaseUrl(env)}/events`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore query events failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { documents?: FirestoreDocument[] };
  if (!data.documents) return [];

  return data.documents.map((doc) => {
    const parsed = parseFields(doc.fields);
    return {
      id: extractDocId(doc.name),
      ...parsed,
    } as unknown as FirestoreEvent;
  });
}

// ---------------------------------------------------------------------------
// Query: buscar um evento por ID
// ---------------------------------------------------------------------------

export async function getEvent(accessToken: string, env: Env, eventId: string): Promise<FirestoreEvent | null> {
  const url = `${firestoreBaseUrl(env)}/events/${eventId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore get event failed (${response.status}): ${errText}`);
  }

  const doc = (await response.json()) as FirestoreDocument;
  const parsed = parseFields(doc.fields);
  return {
    id: extractDocId(doc.name),
    ...parsed,
  } as unknown as FirestoreEvent;
}

// ---------------------------------------------------------------------------
// Update: marcar evento como notificado
// ---------------------------------------------------------------------------

export async function updateEventField(
  accessToken: string,
  env: Env,
  eventId: string,
  field: string,
  value: unknown
): Promise<void> {
  const url = `${firestoreBaseUrl(env)}/events/${eventId}?updateMask.fieldPaths=${field}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        [field]: toFirestoreValue(value),
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore update event field "${field}" failed (${response.status}): ${errText}`);
  }
}

// ---------------------------------------------------------------------------
// Create: nova notificação
// ---------------------------------------------------------------------------

export async function createNotification(
  accessToken: string,
  env: Env,
  data: {
    userId: string;
    title: string;
    message: string;
  }
): Promise<void> {
  const url = `${firestoreBaseUrl(env)}/notifications`;

  const fields: Record<string, FirestoreValue> = {
    userId: { stringValue: data.userId },
    title: { stringValue: data.title },
    message: { stringValue: data.message },
    isRead: { booleanValue: false },
    createdAt: { stringValue: new Date().toISOString() },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore create notification failed (${response.status}): ${errText}`);
  }
}

// ---------------------------------------------------------------------------
// Users: obter todos os FCM tokens
// ---------------------------------------------------------------------------

export async function getAllFcmTokens(accessToken: string, env: Env): Promise<string[]> {
  const url = `${firestoreBaseUrl(env)}/users`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { documents?: FirestoreDocument[] };
  if (!data.documents) return [];

  const tokens: string[] = [];
  for (const doc of data.documents) {
    const parsed = parseFields(doc.fields);
    if (parsed.fcmToken && typeof parsed.fcmToken === 'string') {
      tokens.push(parsed.fcmToken);
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// FCM: enviar Push Notification API v1
// ---------------------------------------------------------------------------

export async function sendFCMMessage(
  accessToken: string,
  env: Env,
  token: string,
  title: string,
  body: string
): Promise<void> {
  const url = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;

  const requestBody = {
    message: {
      token,
      notification: {
        title,
        body
      },
      webpush: {
        notification: {
          icon: '/vite.svg'
        }
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    console.error(`FCM falhou para token ${token.substring(0, 5)}...:`, await response.text());
  }
}
