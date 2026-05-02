# Instruções para o Worker de Notificações (Cloudflare / Cloud Functions)

Para que as notificações agendadas de eventos (24h antes, 1h antes) e envio real de Push Notifications no dispositivo do usuário funcionem com o app fechado (PWA Mobile), é necessário provisionar um Worker ou Cloud Function.

Aqui estão as instruções da lógica e estrutura esperada do seu backend:

## 1. Gatilhos Necessários (Triggers)

Você precisará de pelo menos dois tipos de execução:
- **Evento de Banco de Dados ou HTTP:** Para escutar quando a flag `notifyNow` de um novo aviso for marcada, disparando a notificação push imediatamente.
- **CRON Job (Agendador):** Para rodar de tempos em tempos (ex: a cada 15 minutos) varrendo a coleção `events` do Firestore para checar datas de eventos futuros e avisar `notify24h` ou `notify1h`.

## 2. Acesso e Regras

### Exigência:
- Um Service Account (do Firebase) com acesso de Admin para ler as configurações e escrever de volta (ex: para registrar `notified1h: true`).
- Acesso à API do FCM (Firebase Cloud Messaging).

---

## 3. Lógica do CRON para Lembretes

Use este rascunho de regra mental ou pseudocódigo para o seu Cloudflare Worker (Scheduled) ou Google Cloud Scheduller:

```javascript
export default {
  async scheduled(controller, env, ctx) {
    // 1. Obter a Hora Atual (UTC/Local)
    const now = new Date();
    
    // 2. Query Events: Buscar eventos onde a data é futura ou ocorreu há menos de X,
    // e possua flags notify24h === true OU notify1h === true.
    // Pode otimizar trazendo todos não notificados e validando na memória.
    const pendingEvents = await getFirestoreEvents();

    for (const event of pendingEvents) {
      if (event.type !== 'event') continue;
      
      const eventDateStr = `${event.date}T${event.time || '00:00'}:00`;
      const eventTime = new Date(eventDateStr);
      const diffHours = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Regra 24h:
      if (event.notify24h && !event.notified24h && diffHours <= 24 && diffHours > 0) {
        await sendPushToAll(`Lembrete: amanhã tem ${event.title}`, event.description);
        await markEventAsNotified(event.id, 'notified24h');
      }

      // Regra 1h:
      if (event.notify1h && !event.notified1h && diffHours <= 1 && diffHours > 0) {
        await sendPushToAll(`Daqui a 1 hora: ${event.title}`, event.description);
        await markEventAsNotified(event.id, 'notified1h');
      }
    }
  }
};
```

---

## 4. O que o Frontend (App) já faz:
1. O Painel Admin salva os campos `notifyNow`, `notify24h` e `notify1h` no documento de `events`.
2. O App exibe internamente esses eventos no "**Mural**".
3. Existe uma lista própria de leitura (`readBy`) para auditá-los. 
4. O App cria alertas (Sininho) no painel do usuário através da coleção `notifications`.

## 5. O que precisa ser ajustado no Frontend (SE quiser PUSH visível na tela travada)

Caso deseje que a notificação vibre o celular enquanto a pessoa estiver com a tela apagada (Push Nativo do PWA):
1. Será necessário gerar as **VAPID Keys** nas configurações do Firebase Cloud Messaging.
2. Adicionar no `api.ts` uma requisição a `getToken(messaging, { vapidKey: 'SUA_CHAVE_AQUI' })` logo após o login.
3. Salvar este token no documento do morador (em `users/{uid}`).
4. Seu Cloudflare Worker fará um loop lendo os tokens e enviando via POST request pro endpoint REST de mensageria do Google.
