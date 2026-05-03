# Pre-cadastro e Juncao por Telefone

## Problema

Algumas pessoas pagam pelo WhatsApp e nao querem entrar no app agora. O administrador precisa registrar o pagamento mesmo assim, com comprovante e transparencia no caixa.

## Principio

Nunca juntar contas automaticamente. Telefone e um forte indicio, mas a juncao afeta historico financeiro. O sistema sugere a juncao e exige aprovacao administrativa.

## Implementacao Atual

- Admin pode registrar pagamento externo na aba `Admin > Pessoas`.
- O registro pode usar uma pessoa existente ou criar uma pessoa offline com nome, telefone e pet opcional.
- Pessoas offline usam `users.is_offline = 1`, `user_status = 'active'` e email interno `offline+...@pet-place.local`.
- Pagamentos externos entram em `payments` com comprovante em R2 e `status = 'approved'`, aparecendo imediatamente na transparencia.
- Para mensalidade, se ja existir cobranca do mesmo mes para aquela pessoa/familia, o Worker atualiza a cobranca existente em vez de criar duplicada.
- Quando uma conta real salva um telefone igual ao de uma pessoa offline, o Worker cria uma linha em `identity_link_suggestions`.
- Admin ve sugestoes pendentes em `Admin > Pessoas` e pode aprovar ou recusar.

## O Que Acontece Ao Aprovar

1. `payments.family_id` da pessoa offline e movido para a familia/conta real.
2. Pets cadastrados na pessoa offline sao movidos para a conta real.
3. Se a conta real ainda nao tiver pet preenchido, herda o nome do pet offline.
4. A pessoa offline e bloqueada para nao aparecer como ativa.
5. Mensalidades pendentes/rejeitadas duplicadas sao removidas quando ja existe mensalidade aprovada para o mesmo mes.
6. A sugestao fica marcada como `approved`.

## Regras

- Telefone deve ser normalizado no formato nacional sem `+55`.
- Um par de usuarios nao deve ter multiplas sugestoes abertas iguais.
- Rejeitar uma sugestao nao move dados.
- Historico financeiro aprovado nao e apagado; ele e reassociado.
- Merge automatico continua proibido.
