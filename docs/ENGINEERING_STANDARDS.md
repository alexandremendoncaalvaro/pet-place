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
- Comprovantes de terceiros e recibos não entram em payload público de transparência.
- Mutações devem chamar `notifyDataChanged()` somente quando a UI precisa refazer leituras imediatamente.
- Polling deve ser moderado. Default atual: 120s, com invalidação por topic quando realtime estiver ativo.
- Service workers devem ter escopo claro, atualização previsível e limpeza de caches incompatíveis.
- Toda regra pura nova deve ganhar teste unitário.
- Toda migration D1 deve ser idempotente quando possível e segura para rodar na esteira.
- Fluxos sensíveis usam `FeedbackProvider` para confirmação/toast, não `alert()` ou `confirm()` nativos.

## O Que Evitar

- Não recriar subscriptions dentro de callbacks que rodam periodicamente.
- Não criar polling por tela se o mesmo dado já está no contexto global.
- Não adicionar SDK externo para resolver algo que o Worker/D1/R2 já fazem bem.
- Não misturar regra de negócio nova direto em componente grande quando ela pode ser uma função pequena testável.
- Não salvar telefones, emails ou IDs em formatos inconsistentes.
- Documentação publicada deve descrever contratos atuais, não decisões abandonadas.

## Quality Gates

Os workflows precisam rodar, nessa ordem:

- `pnpm install --frozen-lockfile`
- `pnpm run security:secrets`
- `pnpm run lint`
- `pnpm test`
- `pnpm run test:e2e`
- `pnpm run build`
- migrations D1 remotas, apenas nos deploys
- deploy Worker
- deploy Pages proxy
- smoke test pós-deploy

O comando local obrigatório antes de promover é:

```powershell
pnpm run quality
```

## Estado Atual

Estabelecido:

- Worker roteia API por domínio (`routePaymentsApi`, `routeUsersApi`, `routePostsApi`, etc.).
- `src/services/api.ts` funciona como fachada pública; HTTP, polling, uploads e push ficam em módulos dedicados.
- `FeedbackProvider` centraliza confirmações, toasts e mensagens de erro.
- Regras financeiras puras ficam em `src/lib/finance.ts` e têm teste unitário.
- Política de mídia financeira fica em `worker/security.ts` e tem teste unitário.
- Telefone brasileiro tem normalização/formatação testada.
- Dev e produção têm branches, bancos e buckets separados.

Pontos de evolução:

- `AdminPanel.tsx` é grande. Novas telas administrativas devem nascer em componentes próprios.
- `worker/index.ts` ainda concentra handlers. Nova feature grande deve mover handlers para arquivos por domínio.
- E2E funcional de navegador usa Playwright com fixtures determinísticas de API.
- E2E ponta a ponta contra D1/R2 reais ainda depende de autenticação de teste segura para ambiente dev/test.

## Plano de Testes Recomendado

- Unitário: formatação/normalização, cálculo de caixa, filtro por mês, rateio por família.
- Integração Worker: auth mockada, permissões admin/usuário, pagamentos, despesas, upload de mídia e backup, preferencialmente com `@cloudflare/vitest-pool-workers`.
- Importação de dados: fixtures com usuários, família, comprovante ausente, mídia inválida e pagamentos duplicados.
- E2E: login, mural, comprovante próprio, transparência sem mídia privada, painel admin e upload de recibo.
- Smoke pós-deploy: `/api/health`, assets, D1 bindings e Pages proxy por Service Binding.

## Backlog Técnico Priorizado

1. Criar testes de integração do Worker com D1/R2 mockados para permissões e mutações financeiras.
2. Mover handlers do Worker por domínio: auth, users, payments, expenses, posts, notifications e media.
3. Quebrar `AdminPanel.tsx` em componentes por aba quando houver nova demanda administrativa.
4. Adicionar E2E ponta a ponta contra D1/R2 dev sem depender de conta real de usuário.
