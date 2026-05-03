# Pet Place

<p align="center">
  <img src="assets/pet-place.jpeg" alt="Símbolo do Pet Place" width="420" />
</p>

Aplicação comunitária para organizar a manutenção do Pet Place do bairro com transparência financeira, registro de comprovantes, mural social e gestão simples de pagamentos.

O projeto resolve uma necessidade real: manter um espaço comunitário para pets com prestação de contas clara, participação voluntária e baixo atrito para quem não quer instalar ou aprender uma ferramenta complexa.

## Produto

- Login com Google e sessão segura via cookie HttpOnly.
- Mensalidades, doações e rateios por grupo familiar.
- Registro administrativo de pagamentos recebidos fora do app.
- Aprovação de comprovantes e recibos.
- Extrato comunitário com entradas, saídas e histórico transparente.
- Mural com publicações, comentários, curtidas e marcações.
- Cadastro de tutores, pets e vínculos familiares.
- Sugestão de vínculo por telefone para unir cadastros offline e contas reais com aprovação administrativa.
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
- `mise` e `uv` para tooling local e migração

## Design System

O app usa um design system próprio, documentado em [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

Diretrizes principais:

- grid e espaçamento baseados em múltiplos de 8px;
- tokens explícitos para cor, raio, sombra e tipografia;
- primitives reutilizáveis em `src/components/ui.tsx`;
- componentes com estados consistentes de foco, toque, disabled e feedback;
- visual mobile-first, claro e utilitário, adequado para uso recorrente pela comunidade.

## Mídia

A política de mídia fica em [docs/MEDIA_POLICY.md](docs/MEDIA_POLICY.md). Imagens sociais são otimizadas para WebP, vídeos do mural usam MP4/WebM com capa WebP, e comprovantes ou recibos permanecem no formato original para preservar auditoria.

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

## Seguranca

- Secret Scanning e push protection ficam habilitados no GitHub.
- Dependabot monitora dependencias npm e GitHub Actions.
- `npm run security:secrets` bloqueia secrets hard-coded na arvore atual do repo.
- Credenciais reais devem ficar apenas nos ambientes Cloudflare ou GitHub Actions.

Detalhes em [SECURITY.md](SECURITY.md).

## Padrões de Engenharia

Os padrões de arquitetura, testes, qualidade e operação ficam em [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md).

Resumo:

- D1 é a fonte primária de dados.
- R2 armazena mídia e comprovantes.
- O backend é a fonte de verdade para permissões, identidade e regras financeiras.
- Componentes não devem conter regra financeira complexa.
- Fluxos sensíveis usam confirmação padronizada.
- Toasts substituem `alert()` nativo.
- Mudanças relevantes precisam passar por `npm run quality`.

## Migração

As ferramentas em [tools/migrate](tools/migrate) existem apenas para trazer dados históricos do Firebase para Cloudflare. Firebase não faz parte do runtime atual.
