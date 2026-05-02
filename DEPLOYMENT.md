# Deploy e Ambientes

## Ambientes

| Ambiente | Branch | Worker | Pages | D1 | R2 |
| --- | --- | --- | --- | --- | --- |
| Dev | `dev` ou `develop` | `pet-place-dev` | `https://pet-place-dev.pages.dev` | `caixinha_pet_place_dev` | `caixinha-pet-media-dev` |
| Producao | `main` | `pet-place` | `https://pet-place.pages.dev` | `caixinha_pet_place` | `caixinha-pet-media` |

O Pages nao faz proxy por URL `workers.dev`. Ele usa Service Binding interno:

- `pet-place.pages.dev` chama o binding `PET_PLACE` apontando para o Worker `pet-place`.
- `pet-place-dev.pages.dev` chama o binding `PET_PLACE` apontando para o Worker `pet-place-dev`.

Isso evita derrubar a API caso o hostname `workers.dev` entre em rate limit.

## Fluxo de CI/CD

- Pull requests e branches comuns rodam `npm ci`, `npm run lint` e `npm run build`.
- Push em `dev` ou `develop` publica dev:
  - aplica migrations no D1 dev;
  - publica o Worker `pet-place-dev`;
  - publica o proxy Pages `pet-place-dev`.
- Push em `main` publica producao:
  - aplica migrations no D1 de producao;
  - publica o Worker `pet-place`;
  - publica o proxy Pages `pet-place`.

## Secrets do GitHub

Configure estes secrets no repositorio:

- `CLOUDFLARE_ACCOUNT_ID`: `1bc0494aaf3a778b04ae75b0acca2e52`
- `CLOUDFLARE_API_TOKEN`: token da Cloudflare com permissoes para Workers, D1 e Pages.

Os secrets da aplicacao continuam na Cloudflare por ambiente, nao no GitHub:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## OAuth Google

Os redirects autorizados precisam incluir:

- `https://pet-place.pages.dev/api/auth/google/callback`
- `https://pet-place-dev.pages.dev/api/auth/google/callback`

Os callbacks diretos `workers.dev` podem existir para emergencia, mas o caminho normal dos usuarios deve ser sempre via Pages.
