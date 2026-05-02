/**
 * index.ts — Entry point do Cloudflare Worker.
 *
 * Handlers:
 *   scheduled() → CRON a cada 15 min — varre eventos e cria lembretes
 *   fetch()     → HTTP POST /notify-now — notificação imediata
 */

import type { Env } from './auth';
import { processScheduledEvents, processImmediateNotification } from './notifications';

export default {
  /**
   * CRON Trigger — roda a cada 15 minutos.
   * Varre a coleção `events` no Firestore e cria notificações
   * para eventos que estão a ≤24h ou ≤1h de acontecer.
   */
  async scheduled(
    controller: any,
    env: Env,
    ctx: any
  ): Promise<void> {
    console.log(`[CRON] Executando verificação de eventos agendados — ${new Date().toISOString()}`);

    try {
      const result = await processScheduledEvents(env);
      console.log(`[CRON] Concluído. Eventos avaliados: ${result.processed}, Notificações criadas: ${result.notified}`);
    } catch (error) {
      console.error('[CRON] Erro ao processar eventos:', error);
    }
  },

  /**
   * HTTP Handler — POST /notify-now
   *
   * Body: { "eventId": "abc123" }
   *
   * Lê o evento do Firestore e cria uma notificação imediata
   * para todos os usuários (userId: 'all').
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: any
  ): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'caixinha-notifications',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /notify-now
    if (url.pathname === '/notify-now' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { eventId?: string };

        if (!body.eventId) {
          return new Response(
            JSON.stringify({ error: 'Campo "eventId" é obrigatório.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        await processImmediateNotification(env, body.eventId);

        return new Response(
          JSON.stringify({ success: true, eventId: body.eventId }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('[HTTP] Erro em /notify-now:', error);
        return new Response(
          JSON.stringify({ error: message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // POST /test-cron — executa o CRON manualmente (útil para debug)
    if (url.pathname === '/test-cron' && request.method === 'POST') {
      try {
        const result = await processScheduledEvents(env);
        return new Response(
          JSON.stringify({ success: true, ...result }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('[HTTP] Erro em /test-cron:', error);
        return new Response(
          JSON.stringify({ error: message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Rota não encontrada.' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};
