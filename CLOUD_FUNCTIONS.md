# Instruções para o Worker de Notificações (Cloudflare Workers)

Para que as notificações agendadas de eventos (24h antes, 1h antes) e envio real de Push Notifications no dispositivo do usuário funcionem com o app fechado, utilize a estrutura pronta gerada na pasta `/workers/notifications`.

Este worker fará o meio-campo usando a Firebase REST API (sem precisar do SDK pesado do Firebase-Admin). Ele verifica eventos criados via painel e dispara as notificações via FCM (Firebase Cloud Messaging).

---

## 1. O que você precisa configurar

### No Firebase (Painel):
1. Acesse: Configurações de Projeto -> Contas de Serviço (Service Accounts).
2. Gere e baixe a nova chave privada (**Firebase Admin SDK**). 
3. Habilite o envio e geração do FCM HTTP v1 Web Push Credentials e consiga sua **VPAID Key**. Coloque-a no arquivo `.env` do Front-End como `VITE_FCM_VAPID_KEY`.

### No seu ambiente Cloudflare (Wrangler):
Na pasta `/workers/notifications/`, você deve injetar os seguintes secrets pelo wrangler:

```bash
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put FIRESTORE_DATABASE_ID
```
*(Preencha os valores contidos no arquivo JSON baixado de `Service Accounts` no Firebase. O DATABASE_ID normalmente é `(default)`).*

No frontend, ajuste a variável `VITE_WORKER_URL` para o endereço provisionado do seu Cloudflare Worker após executar o `deploy`.

---

## 2. Visão Geral da Arquitetura

Foram criados 4 arquivos principais de back-end (que você pode fazer o deploy diretamente a partir da pasta `/workers/notifications`):

- **`wrangler.toml`**: Configura o script como módulo TypeScript e agenda a CRON (`*/15 * * * *`)
- **`src/auth.ts`**: Um conversor nativo OAuth2 JWT usando o Web Crypto API. Gera os access tokens do Google sem ter que instalar bibliotecas node.
- **`src/firestore.ts`**: Um minicliente REST para gravar notificações no Cloud Firestore via endpoints serverless, ler usuários para buscar o campo `fcmToken`, e enviar chamadas POST para `https://fcm.googleapis.com/v1/.../messages:send`.
- **`src/notifications.ts`**: Lógica de "Regras de Horários" (24h antes e 1h antes) com base no CRON, assim como a regra `notify-now` para chamadas via `fetch()`.
- **`src/index.ts`**: O esqueleto (Entrypoint) do worker com Triggers HTTP (`fetch()`) para `/notify-now` e o Trigger nativo (`scheduled()`).

Você já possui todo o código pronto dentro do diretório gerado! Apenas acesse a pasta `workers/notifications`, ajuste a configuração e instale os pacotes npm, em seguida rode o deploy usando Wrangler:

```bash
cd workers/notifications
npm install
npm run deploy
```

## 3. Comportamento do Front-end em relação ao Worker

1. Com a chave configurada no App (`VITE_FCM_VAPID_KEY`), ao logar o usuário irá autorizar Notificações no navegador/dispositivo móvel.
2. O Front enviará a Token da maquina e guardará no Firestore na collection `users`, no campo `fcmToken`.
3. Ao enviar um "Novo Evento" marcando o checkbox de `Notificar Imediatamente`, o AdminPanel mandará um payload `{"eventId": "..."}` pro seu script rodando no endpoint `/notify-now` no Cloudflare Worker (`VITE_WORKER_URL`).
4. O CRON rodará automaticamente de 15 em 15 minutos para fazer a varredura nas flags dos eventos não notificados previamente de 24h/1h.
5. Se não houver configuração de Cloudflare, o App fará as inserções básicas na mão via Firestore diretamente, onde apenas se exibirá dentro da campainha interna do navegador local do condômino.
