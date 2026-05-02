# Caixinha Pet Place

App comunitário para organizar a manutenção do Pet Place do bairro com transparência financeira, mural social e gestão simples de pagamentos.

O projeto nasceu de uma necessidade real: registrar contribuições, despesas, comprovantes e comunicados de uma comunidade que cuida coletivamente de um espaço para pets. A aplicação foi migrada para uma arquitetura 100% Cloudflare, com frontend React, Worker, D1, R2, OAuth Google próprio e Web Push nativo.

## Funcionalidades

- Login com Google e sessão segura via cookie HttpOnly.
- Painel de mensalidades, doações e rateios por grupo familiar.
- Aprovação administrativa de comprovantes, incluindo pessoas que ainda não usam o app.
- Transparência do caixa com entradas, saídas e comprovantes.
- Mural da comunidade com fotos, comentários, curtidas e marcações.
- Cadastro de pets e tutores.
- Sugestão de vínculo por telefone para unir cadastros offline e contas reais com aprovação admin.
- Notificações Web Push sem Firebase Cloud Messaging.

## Arquitetura

```text
React/Vite SPA
  -> Cloudflare Pages proxy
  -> Cloudflare Worker API
  -> D1 para dados relacionais
  -> R2 para comprovantes e mídia
  -> Web Push nativo
```

Ambientes:

- Dev: https://pet-place-dev.pages.dev, branch `development`
- Produção: https://pet-place.pages.dev, branch `main`

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Cloudflare Pages
- GitHub Actions
- Vitest
- `mise` e `uv` para tooling local/migração

## Rodando localmente

```powershell
npm ci
npm run dev
```

Para validar antes de promover:

```powershell
npm run quality
```

O comando roda typecheck, testes unitários e build de produção.

## Deploy

O deploy é automatizado por GitHub Actions:

- push em `development` publica o ambiente dev;
- push em `main` publica produção;
- release candidates usam tags `vX.Y.Z-rc.N`;
- releases finais usam tags `vX.Y.Z`.

Detalhes em [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) e [DEPLOYMENT.md](DEPLOYMENT.md).

## Padrões do Projeto

Os padrões de arquitetura, testes, qualidade e operação ficam em [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md).

Resumo das decisões principais:

- D1 é a fonte primária de dados.
- R2 armazena mídia e comprovantes.
- O backend é a fonte de verdade para permissões, identidade e regras financeiras.
- Componentes não devem conter regra financeira complexa.
- Fluxos sensíveis usam confirmação padronizada.
- Toasts substituem `alert()` nativo.
- Mudanças relevantes precisam passar por `npm run quality`.

## Migração

As ferramentas em [tools/migrate](tools/migrate) existem apenas para trazer dados históricos do Firebase para Cloudflare. Firebase não faz parte do runtime atual.
