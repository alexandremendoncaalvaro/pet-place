# Pre-cadastro e Junção por Telefone

## Problema

Algumas pessoas pagam pelo WhatsApp e nao querem entrar no app agora. O administrador precisa registrar o pagamento mesmo assim, sem perder a chance de vincular esses dados quando a pessoa entrar no futuro.

## Principio

Nunca juntar contas automaticamente. Telefone e um forte indício, mas a juncao afeta historico financeiro. O sistema deve sugerir a juncao e exigir aprovacao administrativa.

## Modelo Proposto

Adicionar um tipo de usuario pre-cadastrado:

- `user_status = 'pre_registered'` ou uma coluna `source = 'admin_created'`.
- `email` pode ser placeholder interno, mas nao deve ser usado para login.
- `phone` deve ser obrigatorio e normalizado.
- pagamentos/comprovantes podem apontar para esse `users.id` como `family_id`.

Quando alguem logar com Google:

1. O Worker cria ou encontra o usuario Google normalmente.
2. Se o usuario informar telefone no perfil, o backend normaliza.
3. O backend procura pre-cadastros ativos com o mesmo telefone.
4. Se encontrar, cria uma sugestao de juncao pendente para admins.
5. Admin aprova ou rejeita.
6. Ao aprovar, o sistema move pagamentos, pets e historico do pre-cadastro para a conta Google, preservando auditoria.

## Tabelas Recomendadas

`identity_link_suggestions`

- `id`
- `candidate_user_id`: usuario Google real.
- `pre_registered_user_id`: usuario criado por admin.
- `phone`
- `status`: `pending`, `approved`, `rejected`
- `created_at`
- `reviewed_by`
- `reviewed_at`

## Regras

- Um telefone normalizado nao deve gerar varias sugestoes abertas para o mesmo par.
- Admin deve ver nome, telefone, pagamentos e comprovantes antes de aprovar.
- A aprovacao deve ser transacional no D1.
- Historico financeiro nunca deve ser apagado; apenas reassociado.
- Rejeicao deve impedir nova sugestao automatica para o mesmo par, a menos que um admin reabra.

## MVP Seguro

1. Adicionar pre-cadastro admin com nome e telefone.
2. Permitir admin anexar comprovante e marcar mensalidade como paga para pre-cadastro.
3. Ao usuario real salvar telefone, gerar sugestao de juncao.
4. Tela admin lista sugestoes.
5. Admin aprova e o Worker reassocia `payments.family_id`.

Esse fluxo resolve o caso WhatsApp sem obrigar entrada no app e sem risco de juntar pessoas erradas automaticamente.
