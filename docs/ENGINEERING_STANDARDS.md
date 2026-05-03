# Padrões de Engenharia

Este app deve continuar simples, mas não informal. A regra é: pouca arquitetura, bem nomeada, contratos claros e testes nos pontos que podem quebrar caixa, identidade ou permissão.

## Arquitetura Atual

- Frontend: React/Vite em `src/`.
- API/runtime: Cloudflare Worker em `worker/index.ts`.
- Persistência: D1 como fonte primária.
- Mídia: R2, acessado por `/api/media/:key`.
- Autenticação: Google OAuth próprio no Worker, sessão em cookie HttpOnly.
- Deploy: GitHub Actions publica `development` em dev e `main` em produção.

## Padrões Obrigatórios

- Dados financeiros e identidade devem ter regra no backend. UI ajuda, mas não é fonte de verdade.
- Telefone brasileiro deve ser armazenado normalizado, sem pontuação e sem `+55` quando nacional. Exemplo canônico: `47999999999`.
- UI deve mostrar telefone como `(47) 99999-9999`.
- Comprovantes e recibos sobem como arquivo original. Não comprimir documento financeiro.
- Mutações devem chamar `notifyDataChanged()` somente quando a UI precisa refazer leituras imediatamente.
- Polling deve ser moderado. Default atual: 60s. Conteúdo social/notificações/comentários: 30s.
- Service workers antigos precisam ser limpos quando trocamos provider de push.
- Toda regra pura nova deve ganhar teste unitário.
- Toda migration D1 deve ser idempotente quando possível e segura para rodar na esteira.
- Fluxos sensíveis usam `FeedbackProvider` para confirmação/toast, não `alert()` ou `confirm()` nativos.

## O Que Evitar

- Não recriar subscriptions dentro de callbacks que rodam periodicamente.
- Não criar polling por tela se o mesmo dado já está no contexto global.
- Não adicionar SDK externo para resolver algo que o Worker/D1/R2 já fazem bem.
- Não misturar regra de negócio nova direto em componente grande quando ela pode ser uma função pequena testável.
- Não salvar telefones, emails ou IDs em formatos inconsistentes.
- Não publicar docs antigas que contradizem a arquitetura atual.

## Quality Gates

Os workflows precisam rodar, nessa ordem:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`
- migrations D1 remotas, apenas nos deploys
- deploy Worker
- deploy Pages proxy
- smoke test pós-deploy

O comando local obrigatório antes de promover é:

```powershell
npm run quality
```

## Estado da Revisão Senior

Resolvido:

- Worker roteia API por domínio (`routePaymentsApi`, `routeUsersApi`, `routePostsApi`, etc.).
- `src/services/api.ts` funciona como fachada pública; HTTP, polling, uploads e push ficam em módulos dedicados.
- Feedback de UI foi padronizado em `FeedbackProvider`; não há `alert()` nativo nos componentes React.
- Regras financeiras puras ficam em `src/lib/finance.ts` e têm teste unitário.
- Telefone brasileiro tem normalização/formatação testada.
- Dev e produção têm branches, bancos e buckets separados.
- Docs antigas de Firebase runtime foram removidas da raiz. Firebase permanece apenas como fonte histórica nas ferramentas de migração.

Ainda aceitável por enquanto:

- `AdminPanel.tsx` é grande. Novas telas administrativas devem nascer em componentes próprios.
- `worker/index.ts` ainda concentra handlers. Nova feature grande deve mover handlers para arquivos por domínio.
- E2E completo com login simulado ainda é backlog; hoje há unit tests, build/typecheck e smoke pós-deploy.

## Plano de Testes Recomendado

- Unitário: formatação/normalização, cálculo de caixa, filtro por mês, rateio por família.
- Integração Worker: auth mockada, permissões admin/usuário, pagamentos, despesas, upload de mídia e backup.
- Migração: fixtures com usuários, família, comprovante ausente, mídia inválida e pagamentos duplicados.
- E2E: login, mural, comprovante, transparência, painel admin e upload de recibo.
- Smoke pós-deploy: `/api/health`, assets, D1 bindings e Pages proxy por Service Binding.

## Backlog Técnico Priorizado

1. Criar testes de integração do Worker com D1/R2 mockados para permissões e mutações financeiras.
2. Mover handlers do Worker por domínio: auth, users, payments, expenses, posts, notifications e media.
3. Quebrar `AdminPanel.tsx` em componentes por aba quando houver nova demanda administrativa.
4. Adicionar E2E/smoke automatizado sem depender de conta real de usuário.
