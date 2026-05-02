/**
 * notifications.ts — Lógica de negócio para notificações.
 *
 * - processScheduledEvents: CRON loop — checa 24h/1h antes de eventos
 * - processImmediateNotification: disparo imediato (notifyNow)
 */

import type { Env } from './auth';
import { getAccessToken } from './auth';
import {
  queryEvents,
  getEvent,
  updateEventField,
  createNotification,
  type FirestoreEvent,
} from './firestore';

// ---------------------------------------------------------------------------
// CRON: processar lembretes de eventos agendados
// ---------------------------------------------------------------------------

export async function processScheduledEvents(env: Env): Promise<{ processed: number; notified: number }> {
  const accessToken = await getAccessToken(env);
  const events = await queryEvents(accessToken, env);

  const now = new Date();
  let processed = 0;
  let notified = 0;

  for (const event of events) {
    // Só processar eventos do tipo 'event' (não announcements)
    if (event.type !== 'event') continue;
    // Precisa ter data
    if (!event.date) continue;

    processed++;

    const eventDateStr = `${event.date}T${event.time || '00:00'}:00`;
    const eventTime = new Date(eventDateStr);

    // Se a data for inválida, pula
    if (isNaN(eventTime.getTime())) {
      console.warn(`Evento ${event.id} com data inválida: ${eventDateStr}`);
      continue;
    }

    const diffMs = eventTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Regra 24h: notificar quando faltam ≤24h e >0h
    if (event.notify24h && !event.notified24h && diffHours <= 24 && diffHours > 0) {
      console.log(`[24h] Notificando evento "${event.title}" (${event.id})`);

      await createNotification(accessToken, env, {
        userId: 'all',
        title: `📅 Lembrete: amanhã tem "${event.title}"`,
        message: event.description || 'Confira os detalhes no mural.',
      });

      await updateEventField(accessToken, env, event.id, 'notified24h', true);
      notified++;
    }

    // Regra 1h: notificar quando faltam ≤1h e >0h
    if (event.notify1h && !event.notified1h && diffHours <= 1 && diffHours > 0) {
      console.log(`[1h] Notificando evento "${event.title}" (${event.id})`);

      await createNotification(accessToken, env, {
        userId: 'all',
        title: `⏰ Daqui a 1 hora: "${event.title}"`,
        message: event.description || 'Confira os detalhes no mural.',
      });

      await updateEventField(accessToken, env, event.id, 'notified1h', true);
      notified++;
    }
  }

  return { processed, notified };
}

// ---------------------------------------------------------------------------
// HTTP: notificação imediata (notifyNow)
// ---------------------------------------------------------------------------

export async function processImmediateNotification(env: Env, eventId: string): Promise<void> {
  const accessToken = await getAccessToken(env);
  const event = await getEvent(accessToken, env, eventId);

  if (!event) {
    throw new Error(`Evento não encontrado: ${eventId}`);
  }

  // Evitar notificação duplicada
  if (event.notifiedNow) {
    console.log(`Evento "${event.title}" já foi notificado (notifiedNow=true). Pulando.`);
    return;
  }

  const emoji = event.type === 'event' ? '📢' : '📌';

  await createNotification(accessToken, env, {
    userId: 'all',
    title: `${emoji} ${event.title}`,
    message: event.description || '',
  });

  // Marcar como notificado
  await updateEventField(accessToken, env, event.id, 'notifiedNow', true);

  console.log(`[now] Notificação imediata enviada para evento "${event.title}" (${event.id})`);
}
