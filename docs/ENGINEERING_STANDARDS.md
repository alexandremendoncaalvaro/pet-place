# Padroes de Engenharia

Este app deve continuar simples, mas nao informal. A regra e: pouca arquitetura, bem nomeada, com contratos claros e testes nos pontos que podem quebrar caixa, identidade ou permissao.

## Arquitetura Atual

- Frontend: React/Vite em `src/`.
- API/runtime: Cloudflare Worker em `worker/index.ts`.
- Persistencia: D1 como fonte primaria.
- Midia: R2, acessado por `/api/media/:key`.
- Autenticacao: Google OAuth proprio no Worker, sessao em cookie HttpOnly.
- Deploy: GitHub Actions publica `main` em producao e `dev` em desenvolvimento.

## Padroes Obrigatorios

- Dados financeiros e identidade devem ter regra no backend. UI ajuda, mas nao e fonte de verdade.
- Telefone brasileiro deve ser armazenado normalizado, sem pontuacao e sem `+55` quando nacional. Exemplo canonico: `47999999999`.
- UI deve mostrar telefone como `(47) 99999-9999`.
- Comprovantes e recibos sobem como arquivo original. Nao comprimir documento financeiro.
- Mutacoes devem chamar `notifyDataChanged()` somente quando a UI precisa refazer leituras imediatamente.
- Polling deve ser moderado. Default atual: 60s. Conteudo social/notificacoes/comentarios: 30s.
- Service workers antigos precisam ser limpos quando trocamos provider de push.
- Toda regra pura nova deve ganhar teste unitario.
- Toda migration D1 deve ser idempotente quando possivel e segura para rodar na esteira.

## O Que Evitar

- Nao recriar subscriptions dentro de callbacks que rodam periodicamente.
- Nao criar polling por tela se o mesmo dado ja esta no contexto global.
- Nao adicionar SDK externo para resolver algo que o Worker/D1/R2 ja fazem bem.
- Nao misturar regra de negocio nova direto em componente grande quando ela pode ser uma funcao pequena testavel.
- Nao salvar telefones, emails ou IDs em formatos inconsistentes.

## Quality Gates

Os workflows precisam rodar, nessa ordem:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`
- migrations D1 remotas, apenas nos deploys
- deploy Worker
- deploy Pages proxy

## Estado da Revisao Senior

Achados atuais:

- `worker/index.ts` esta grande demais. Aceitavel no curto prazo, mas novas features devem nascer em helpers ou modulos pequenos antes de aumentar esse arquivo.
- `src/services/api.ts` concentra transporte, polling, uploads, push e normalizacao. Manter simples por enquanto, mas extrair quando uma area passar a ter regra propria.
- `AdminPanel.tsx` e o maior componente de UI. Novas telas administrativas devem virar componentes proprios.
- Alteracoes administrativas destrutivas ou sensiveis precisam de confirmacao explicita ou fluxo de aprovacao. Troca de papel admin/resident ja exige confirmacao; exclusao/restauracao ainda deve migrar para um modal padronizado.
- Regras financeiras nao devem ficar embutidas em componentes. O calculo de caixa agora mora em `src/lib/finance.ts` e tem teste unitario.
- Permissoes de UI devem sair do contexto tipado, nao de flags soltas em componentes. `isAdmin` faz parte do `AppContext`.
- Telefone sera a chave candidata para sugestao de vinculo futuro, mas nunca deve fazer merge automatico. O fluxo correto esta documentado em `docs/IDENTITY_LINKING.md`.
- Testes eram inexistentes. A suite comecou por regras puras de telefone; proximo passo e cobrir permissoes do Worker e fluxo financeiro.
- Pipeline agora tem teste unitario, typecheck e build. Ainda falta E2E/smoke automatizado com login simulado ou rota de teste protegida por ambiente.

## Plano de Testes Recomendado

- Unitario: formatacao/normalizacao, calculo de caixa, filtro por mes, rateio por familia.
- Integracao Worker: auth mockada, permissoes admin/resident, pagamentos, despesas, upload de midia e backup.
- Migracao: fixtures com usuarios, familia, comprovante ausente, midia invalida e pagamentos duplicados.
- E2E: login, mural, comprovante, transparencia, painel admin e upload de recibo.
- Smoke pos-deploy: `/api/health`, assets, D1 bindings e Pages proxy por Service Binding.

## Backlog Tecnico Priorizado

1. Extrair rotas do Worker por dominio: auth, users, payments, expenses, posts, notifications e media.
2. Criar testes de integracao do Worker com D1/R2 mockados para permissoes e mutacoes financeiras.
3. Substituir `alert()`/`confirm()` espalhados por componentes pequenos de dialog/toast.
4. Separar `src/services/api.ts` em cliente HTTP, subscriptions/polling, uploads e push.
5. Adicionar E2E/smoke automatizado sem depender de conta real de usuario.
