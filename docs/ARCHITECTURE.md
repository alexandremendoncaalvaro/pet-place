# Arquitetura

## Visão Geral

```text
React/Vite SPA
  -> Cloudflare Pages proxy
  -> Cloudflare Worker API
  -> D1, R2 e Durable Object
```

O Worker é a fronteira obrigatória de regras sensíveis. O frontend organiza experiência, estado e chamadas de API, mas não decide identidade, permissão ou regra financeira.

## Fronteiras Atuais

- `src/components/`: telas e componentes React.
- `src/context/AppContext.tsx`: composição de subscriptions e estado global da aplicação.
- `src/services/`: cliente HTTP, subscriptions, realtime, push e uploads.
- `src/lib/`: tipos e regras puras testáveis.
- `worker/index.ts`: roteamento HTTP, autorização, persistência D1/R2, Web Push, scheduled jobs e Durable Object.
- `worker/security.ts`: políticas puras de autorização de mídia do Worker.
- `migrations/`: evolução do schema D1.
- `tools/`: utilitários operacionais, incluindo smoke test, scanner de secrets e migração com `uv`.

## Fluxo de Dados

1. O React chama funções de `src/services/api.ts`.
2. `src/services/http.ts` envia requisições para `/api/*`.
3. `worker/index.ts` autentica a sessão, autoriza a rota e grava/lê D1/R2.
4. Mutations publicam eventos por topic.
5. Subscriptions e realtime invalidam leituras por topic.

## Transparência Financeira

O produto expõe um extrato comunitário para usuários autenticados, mas mídia financeira não faz parte desse contrato público. Pagamentos listados por família preservam comprovantes para a própria família e para admins. O endpoint de extrato completo redige comprovantes para usuários comuns e mantém recibos de despesas apenas para admins.

Mesmo que uma URL de R2 seja obtida por outro caminho, `/api/media/:key` resolve o vínculo no D1 antes de servir o objeto. Comprovantes exigem admin ou família dona, recibos exigem admin e mídia pública da aplicação continua disponível para usuários autenticados.

## Estado Atual de Maturidade

O projeto tem uma arquitetura simples e funcional, com boa separação entre UI, serviços e regras puras. O ponto fraco principal é concentração excessiva em poucos arquivos:

- `worker/index.ts` concentra múltiplos domínios.
- `src/components/AdminPanel.tsx` concentra várias telas administrativas.
- `src/context/AppContext.tsx` mistura bootstrap, auth, subscriptions e composição de estado.

Essa concentração ainda é administrável, mas deve ser quebrada antes de novas features grandes.

## Direção Recomendada

Próxima evolução sem trocar stack:

- Separar o Worker por domínio: `auth`, `users`, `payments`, `expenses`, `posts`, `notifications`, `media`, `backup`.
- Criar helpers tipados para input parsing e validação de payloads.
- Evoluir testes de integração do Worker com `@cloudflare/vitest-pool-workers` quando houver harness de D1/R2 local.
- Dividir `AdminPanel.tsx` em componentes por aba.
- Dividir o contexto global em providers menores ou hooks de domínio quando houver novas telas.
- Adicionar testes de integração do Worker para autorização e validações financeiras.

## Regras de Dependência

- Componentes podem importar `context`, `services`, `lib` e `ui`.
- `services` podem importar `lib`, mas não componentes.
- `lib` deve permanecer puro e sem dependência de React, DOM ou Worker.
- Worker não deve importar componentes nem serviços do frontend.
- Regras financeiras novas devem nascer em `src/lib` ou em módulo de domínio do Worker, não diretamente em componente.
