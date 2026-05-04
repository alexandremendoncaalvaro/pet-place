# Pré-cadastro e Junção por Telefone

## Problema

Algumas pessoas pagam pelo WhatsApp e não querem entrar no app agora. O administrador precisa registrar o pagamento mesmo assim, com comprovante e transparência no caixa.

## Principio

Nunca juntar contas automaticamente. Telefone é um forte indício, mas a junção afeta histórico financeiro. O sistema sugere a junção e exige aprovação administrativa.

## Implementacao Atual

- Admin pode registrar pagamento externo na aba `Admin > Pessoas`.
- O registro pode usar uma pessoa existente ou criar uma pessoa offline com nome, telefone e pet opcional.
- Pessoas offline usam `users.is_offline = 1`, `user_status = 'active'` e email interno `offline+...@pet-place.local`.
- Pagamentos externos entram em `payments` com comprovante em R2 e `status = 'approved'`, aparecendo imediatamente na transparência.
- Para mensalidade, se já existir cobrança do mesmo mês para aquela pessoa/família, o Worker atualiza a cobrança existente em vez de criar duplicada.
- Quando uma conta real salva um telefone igual ao de uma pessoa offline, o Worker cria uma linha em `identity_link_suggestions`.
- Admin vê sugestões pendentes em `Admin > Pessoas` e pode aprovar ou recusar.

## O Que Acontece Ao Aprovar

1. `payments.family_id` da pessoa offline é movido para a família/conta real.
2. Pets cadastrados na pessoa offline são movidos para a conta real.
3. Se a conta real ainda não tiver pet preenchido, herda o nome do pet offline.
4. A pessoa offline é bloqueada para não aparecer como ativa.
5. Mensalidades pendentes/rejeitadas duplicadas são removidas quando já existe mensalidade aprovada para o mesmo mês.
6. A sugestão fica marcada como `approved`.

## Regras

- Telefone deve ser normalizado no formato nacional sem `+55`.
- Um par de usuários não deve ter múltiplas sugestões abertas iguais.
- Rejeitar uma sugestão não move dados.
- Histórico financeiro aprovado não é apagado; ele é reassociado.
- Merge automático continua proibido.
