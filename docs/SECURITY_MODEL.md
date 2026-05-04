# Modelo de Segurança

Este projeto usa Cloudflare Worker como fronteira obrigatória para todas as regras sensíveis. O frontend melhora a experiência, mas não é fonte de verdade para identidade, permissões ou finanças.

## Invariantes

- Apenas usuários autenticados podem acessar rotas privadas.
- Apenas admins podem aprovar pagamentos, rejeitar comprovantes, criar despesas, criar cobranças, restaurar backup e alterar papel de usuários.
- Usuários comuns só podem alterar o próprio perfil e enviar comprovantes dos próprios pagamentos/família.
- O extrato comunitário pode mostrar lançamentos financeiros agregados para todos os usuários autenticados.
- O extrato comunitário redige URLs de comprovantes para usuários comuns; admins recebem comprovantes no extrato completo.
- Recibos de despesas são mídia administrativa e só são expostos para admins.
- Valores financeiros precisam ser positivos e validados no Worker.
- O saldo é derivado de pagamentos aprovados e despesas registradas; não deve ser digitado manualmente.
- Comprovantes e recibos são armazenados no R2 e servidos por rota autenticada com autorização por objeto.
- Vínculo por telefone gera sugestão para admin, nunca merge automático.

## Superfícies Protegidas

- `users`: dados privados só para o próprio usuário ou admin.
- `payments`: usuários veem seus próprios pagamentos com comprovante e o extrato comunitário sem comprovantes de terceiros; admins operam todos.
- `expenses`: leitura no extrato comunitário sem recibos para usuários comuns; escrita e recibos apenas por admin.
- `media`: acesso por rota `/api/media/:key` com sessão válida e política por tipo de objeto:
  - `proofs/*`: admin ou família dona do pagamento.
  - `receipts/*`: admin.
  - `users/*`, `pets/*`, `posts/*`, `posters/*`: mídia pública para usuários autenticados quando houver vínculo no D1.
  - qualquer chave desconhecida ou órfã: negada.
- `backup`: export/restore apenas admin.
- `push_subscriptions`: inscrição vinculada à sessão atual.

## Payloads de Regressão

Testes e revisões devem cobrir estes cenários:

- usuário comum tentando definir `role: "admin"`;
- pagamento criado ou atualizado com valor negativo;
- pagamento enviado direto como `approved`;
- usuário comum tentando aprovar pagamento de outra pessoa;
- usuário comum tentando listar dados privados de todos;
- usuário comum tentando abrir comprovante de outra família por URL direta;
- usuário comum tentando abrir recibo de despesa por URL direta;
- chave de mídia existente no R2 sem vínculo de banco sendo servida;
- despesa criada sem admin autenticado;
- upload de mídia sem sessão;
- merge automático de duas identidades por telefone.

## Operação

- Secrets ficam na Cloudflare ou no GitHub Actions, nunca no repositório.
- Migrations D1 devem ser versionadas e revisadas.
- Ambientes dev e produção usam bancos e buckets separados.
- Backups/exportações reais não devem ser commitados.
