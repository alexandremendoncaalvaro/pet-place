# Estratégia de Testes

Data de referência: 2026-05-04.

## Base Oficial Consultada

- Cloudflare Workers Vitest Integration: a recomendação atual da Cloudflare para testar Workers é usar o pool de Vitest que executa testes dentro do runtime Workers, com acesso a APIs e bindings locais.
- Vitest: mantém a base unitária rápida que o projeto já usa, com arquivos `.test.*` e boa integração com Vite/TypeScript.
- Playwright Best Practices: E2E deve validar comportamento visível ao usuário, manter testes isolados e evitar dependência de terceiros fora do controle do teste.

Links:

- [Cloudflare Workers Vitest Integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

## Pirâmide Atual

- Unitário: `src/lib/*.test.ts`, `src/services/*.test.ts`, `worker/security.test.ts` e `worker/financialRecords.test.ts`.
- Guardrails de arquitetura: `src/architecture.test.ts` protege decisões estruturais e contratos sensíveis.
- Integração leve: `pnpm run build`, `pnpm run lint` e smoke remoto pós-deploy.
- E2E: ainda não há Playwright instalado/configurado neste checkout.

## Contratos Que Devem Ter Regressão

- Valores financeiros sempre positivos no Worker.
- `role` e `userStatus` aceitam apenas enums conhecidos.
- Usuário comum não aprova, rejeita, cria despesas, cria cobranças ou restaura backup.
- Extrato comunitário pode mostrar lançamentos, mas não comprovantes de terceiros nem recibos.
- `/api/media/:key` autoriza por objeto antes de servir R2.
- Mídia órfã ou chave de pasta desconhecida não é servida.

## Próxima Camada de Integração

Adicionar `@cloudflare/vitest-pool-workers` em uma mudança própria, com fixtures controladas de D1/R2, para testar rotas reais do Worker:

- `GET /payments?all=1` como residente redige `proofUrl`.
- `GET /payments?all=1` como admin preserva `proofUrl`.
- `GET /expenses` como residente redige `receiptUrl`.
- `GET /expenses` como admin preserva `receiptUrl`.
- `GET /media/proofs/:key` permite família dona e admin, bloqueia outra família.
- `GET /media/receipts/:key` permite admin, bloqueia residente.
- Mutations financeiras rejeitam valor zero, negativo e não numérico.

## E2E Quando Entrar Playwright

Playwright deve cobrir poucos fluxos críticos, usando locators por papel/texto e dados isolados:

- login e bootstrap autenticado;
- residente envia comprovante próprio;
- transparência mostra saldo e histórico sem botões de mídia privada para residente;
- admin aprova comprovante e cria despesa com recibo;
- smoke visual de mural e navegação principal.

Testes gerados para tutoriais não devem entrar no gate principal sem revisão. E2E deve rodar contra ambiente controlado, não contra dependências externas instáveis.
