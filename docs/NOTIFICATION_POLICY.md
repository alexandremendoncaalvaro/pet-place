# Politica de notificacoes

## Principios

- Toda notificacao deve ter um motivo claro: mencao, curtida, comentario, pagamento, evento ou acao administrativa.
- Notificacoes globais devem ser lidas por usuario, nunca globalmente.
- Mencoes devem ser resolvidas no backend para evitar spoofing e falhas de permissao.
- Pets pertencem a familias: marcar um pet notifica a familia responsavel, exceto quem fez a acao.

## Morador

Recebe notificacoes quando:

- alguem comenta em uma publicacao sua;
- alguem curte uma publicacao sua;
- alguem marca seu perfil em uma publicacao ou comentario;
- alguem marca um pet da sua familia em uma publicacao ou comentario;
- existe mensalidade pendente/rejeitada para uma familia apoiadora ativa;
- um comprovante da familia e aprovado ou recusado;
- a administracao publica aviso/evento para todos.

Nao deve receber notificacao quando:

- curte ou comenta na propria publicacao;
- marca a si mesmo;
- a familia nao e apoiadora recorrente e nao tem cobranca vigente;
- a acao envolve outra familia sem relacao com ele.

## Administrador

Recebe todas as notificacoes normais de morador e tambem:

- novo cadastro aguardando aprovacao;
- sugestao de vinculo por telefone;
- nova doacao aguardando analise;
- comprovante anexado aguardando avaliacao;
- avisos/eventos globais.

## Implementacao atual

- `notifications.type` guarda o motivo.
- `notification_reads` guarda leitura individual de notificacoes `all` e `admins`.
- `post_comment_tags` guarda mencoes feitas em comentarios.
- O Worker resolve alvos de mencao e cria notificacoes; o cliente apenas envia os ids selecionados.
- Curtidas sao agregadas por publicacao quando ha notificacao nao lida.

## Lacunas futuras

- Preferencias por tipo de notificacao.
- Deep link para abrir diretamente publicacao/comentario/pagamento.
- Digest opcional de baixa prioridade para reduzir ruido.
