# Deploy e Ambientes

## Ambientes

| Ambiente | Branch | Worker | Pages | D1 | R2 |
| --- | --- | --- | --- | --- | --- |
| Dev | `development` | `pet-place-dev` | `https://pet-place-dev.pages.dev` | `caixinha_pet_place_dev` | `caixinha-pet-media-dev` |
| Produção | `main` | `pet-place` | `https://pet-place.pages.dev` | `caixinha_pet_place` | `caixinha-pet-media` |

O Pages usa Service Binding interno para chamar a API:

- `pet-place.pages.dev` chama o binding `PET_PLACE` apontando para o Worker `pet-place`.
- `pet-place-dev.pages.dev` chama o binding `PET_PLACE` apontando para o Worker `pet-place-dev`.

Esse desenho mantém a API atrás dos domínios oficiais do app e reduz risco operacional.

## Fluxo de CI/CD

- Pull requests e branches de trabalho rodam `pnpm install --frozen-lockfile`, typecheck, testes e build.
- Push em `development` publica dev:
  - aplica migrations no D1 dev;
  - publica o Worker `pet-place-dev`;
  - publica o proxy Pages `pet-place-dev`;
  - roda smoke test em `https://pet-place-dev.pages.dev`.
- Push em `main` publica produção:
  - aplica migrations no D1 de produção;
  - publica o Worker `pet-place`;
  - publica o proxy Pages `pet-place`;
  - roda smoke test em `https://pet-place.pages.dev`.

## Secrets do GitHub

Configure estes secrets no repositório:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Os secrets da aplicação continuam na Cloudflare por ambiente, não no GitHub:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

`APP_URL` e `VAPID_SUBJECT` são vars plain-text no `wrangler.toml`. Para um
banco novo, `BOOTSTRAP_ADMIN_EMAIL` pode ser usado localmente em `.dev.vars` ou
configurado no ambiente Cloudflare enquanto o primeiro admin ainda não existe.

## Ambiente local

- `.env` é apenas para variáveis `VITE_*` lidas pelo Vite.
- `.dev.vars` é o arquivo do Worker local usado por `pnpm run dev:worker`.
- `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` devem vir do shell, do `mise`
  local ou dos GitHub Actions secrets, não do `.env` do app.

## OAuth Google

Os redirects autorizados precisam incluir:

- `https://pet-place.pages.dev/api/auth/google/callback`
- `https://pet-place-dev.pages.dev/api/auth/google/callback`
- `http://localhost:8787/api/auth/google/callback` para OAuth local via
  `pnpm run dev:worker`

O caminho normal dos usuários deve ser sempre via Pages.
