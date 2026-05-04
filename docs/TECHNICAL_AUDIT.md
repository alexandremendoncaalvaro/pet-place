# Auditoria Técnica

Data: 2026-05-04  
Escopo: documentação, tooling, frontend React/Vite, Cloudflare Worker, D1/R2, CI/CD e organização geral.

## Veredito

O projeto está saudável para o estágio atual: stack simples, deploy automatizado, secrets separados, pnpm adotado, smoke tests e regras puras com cobertura. Ainda não está maduro para crescer muito sem pagar dívida técnica, porque o backend e a área administrativa estão concentrados demais.

Nota de maturidade: 7/10.

## O Que Está Bom

- Stack coerente para o problema: React/Vite, Worker, D1, R2, Pages e GitHub Actions.
- Backend é a fronteira de autorização, não o frontend.
- `src/lib` contém regras puras testáveis, como caixa, telefone, menções e notificações.
- CI/CD tem quality gates, migrations, deploy Worker, deploy Pages e smoke.
- Secrets de app ficam na Cloudflare; GitHub guarda apenas credenciais de deploy.
- `pnpm` e `uv` estão explícitos no fluxo de trabalho.
- Documentação já cobre segurança, mídia, release, design system e identidade offline.

## Correções Feitas Nesta Auditoria

- `DEPLOYMENT.md` foi movido para `docs/DEPLOYMENT.md`.
- Foi criado um índice de documentação em `docs/README.md`.
- Foi criado `docs/ARCHITECTURE.md` com fronteiras e direção evolutiva.
- Foi registrado este relatório em `docs/TECHNICAL_AUDIT.md`.
- O Worker agora rejeita valores financeiros não positivos em doações, pagamentos manuais, cobranças e despesas.
- O Worker agora valida enums de `role` e `userStatus` em atualização de usuário.
- O extrato comunitário agora redige comprovantes para usuários comuns e mantém recibos apenas para admins.
- `/api/media/:key` agora autoriza por objeto: comprovante por família/admin, recibo por admin, mídia pública autenticada e chave órfã negada.
- Foi criado `worker/security.ts` com teste unitário para a política de mídia financeira.
- Foi criado `docs/TEST_STRATEGY.md` com pirâmide atual e evolução recomendada com Cloudflare Vitest pool e Playwright.
- Comentário corrompido em `vite.config.ts` foi corrigido.

## Achados Prioritários

### P1: Falta teste de integração do Worker

A maioria das regras sensíveis vive no Worker, mas a suíte atual ainda não executa rotas reais dentro do runtime Workers. A política de mídia financeira já tem unit test e guardrail textual; o próximo passo é teste de integração com Cloudflare Vitest pool e auth mockada para:

- autorização admin versus residente;
- valores financeiros inválidos;
- upload de mídia;
- backup/restore;
- acesso a comprovantes e recibos.

Referência registrada em [TEST_STRATEGY.md](TEST_STRATEGY.md).

### P2: `worker/index.ts` é grande demais

O arquivo tem mais de 1.600 linhas e mistura roteamento, validação, SQL, serialização, mídia, push, backup e scheduled jobs. Isso atrapalha SOLID na prática: cada domínio muda pelo mesmo motivo e o custo de revisão sobe.

Meta recomendada: extrair módulos por domínio antes da próxima feature grande.

### P2: `AdminPanel.tsx` concentra muitas responsabilidades

O painel administrativo tem mais de 1.200 linhas e mistura aprovações, pessoas, cobranças, backup, eventos, configurações e identidade. O risco principal é regressão visual e regra duplicada quando novas abas entrarem.

Meta recomendada: separar por abas e extrair componentes compostos para formulários recorrentes.

### P2: TypeScript ainda não está em modo estrito

O `tsconfig.json` não declara `strict: true` e o Worker usa muitos `any` por causa de linhas D1 e payloads JSON. Isso é comum em app inicial, mas reduz a capacidade do compilador de segurar contratos.

Meta recomendada: criar tipos de row/payload por domínio e ativar `strict` em etapas.

### P3: `AppContext` virou hub global

O contexto ainda é aceitável, mas já acumula auth, bootstrap, subscriptions, realtime, push e estado de várias telas. Se crescer, a árvore vai renderizar mais do que precisa e ficará difícil testar fluxo por domínio.

Meta recomendada: extrair hooks/providers quando uma nova área consumir estado independente.

## SOLID e Object Calisthenics

Interpretação aplicada: SOLID e disciplina de objetos/funções pequenas, não SolidJS.

- Single Responsibility: bom em `src/lib`, fraco no Worker e no AdminPanel.
- Open/Closed: razoável para UI primitives; fraco para rotas do Worker, que exigem editar arquivo central.
- Interface Segregation: contexto global expõe estado demais para qualquer tela.
- Dependency Inversion: frontend depende de `services/api.ts`, bom; Worker ainda depende diretamente de SQL espalhado.
- Object Calisthenics: faltam limites práticos de tamanho por arquivo/função e encapsulamento de coleções/rows.

## Ordem Recomendada de Refatoração

1. Testes de integração do Worker para rotas financeiras e mídia.
2. Extrair `worker/payments.ts`, `worker/users.ts`, `worker/media.ts` e `worker/auth.ts`.
3. Dividir `AdminPanel` por abas sem mudar comportamento.
4. Tipar rows D1 e payloads de request.
5. Ativar `strict` gradualmente.

## Critério de Pronto Para Novas Features Grandes

- Nenhuma feature nova entra direto em `worker/index.ts` ou `AdminPanel.tsx` sem plano de extração.
- Toda regra financeira nova tem teste.
- Toda rota admin nova tem teste de autorização.
- Toda documentação operacional nova entra em `docs/` e é linkada em `docs/README.md`.
