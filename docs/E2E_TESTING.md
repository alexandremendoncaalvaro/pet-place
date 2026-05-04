# Testes E2E e videos de tutorial

O projeto usa Playwright para testes funcionais de navegador. A escolha segue o suporte atual do Playwright para auto-waiting, web-first assertions, traces e gravacao de video por teste.

## Comandos

```powershell
pnpm run test:e2e
pnpm run test:e2e:headed
pnpm run test:e2e:tutorial
```

- `test:e2e`: roda a suite funcional em Chromium.
- `test:e2e:headed`: abre o navegador para depuracao local.
- `test:e2e:tutorial`: roda uma suite separada, em viewport mobile, com ritmo mais humano, grava videos e copia os arquivos para `docs/tutorials/generated/`.

Por padrao, os videos brutos ficam em `test-results/` e nao entram no Git. O comando de tutorial tambem copia videos renomeados para `docs/tutorials/generated/`, que continua ignorado pelo Git. Videos finais devem ser revisados, comprimidos e salvos manualmente em `docs/tutorials/`.

## Modelo adotado

A suite de regressao usa fixtures de API em `tests/e2e/support/`. Isso deixa o teste deterministico, independente de Google OAuth real e seguro para rodar localmente ou em CI. A suite de tutorial reaproveita as mesmas fixtures, mas tem passos maiores, pausas intencionais e assets reais em `tests/fixtures/media/` para gerar videos compreensiveis.

Os testes E2E devem validar a tela e nao apenas textos auxiliares. Para imagens importantes, como comprovantes, o padrao e validar que o `img` esta visivel, carregado, com `naturalWidth`/`naturalHeight` maiores que zero e opacidade final aplicada.

Esses testes cobrem a aplicacao como usuario, mas ainda nao substituem uma suite futura ponta a ponta contra D1/R2 reais. Para isso, o caminho recomendado e adicionar autenticacao de teste somente em ambiente `dev`/`test`, protegida por segredo e nunca habilitada em producao.

## Caminhos felizes iniciais

1. Home mostra mensalidade vigente e feed inicial.
2. Detalhes da mensalidade exibem historico e comprovante em tela cheia.
3. Extrato mostra entradas, saidas e historico do caixa.
4. Mural lista notificacoes e eventos importantes.
5. Comunidade permite buscar pessoas e pets.
6. Perfil atualiza telefone no formato brasileiro.
7. Nova publicacao aceita mencao digitada com arroba.
8. Curtida atualiza contador da publicacao.
9. Comentario aparece na thread da publicacao.
10. Admin registra pagamento externo com comprovante.

## Tours de tutorial

Os tutoriais sao fluxos narrativos maiores, diferentes dos testes atomicos. O roteiro completo fica em [TUTORIAL_STORYBOARD.md](TUTORIAL_STORYBOARD.md).

1. `post-com-imagem`: cria uma publicacao com imagem, mostra a marcacao por `@`, publica e comenta.
2. `post-com-video`: cria uma publicacao com MP4 curto, mostra preview de video e marcacao de pet.
3. `pagamento-e-transparencia`: registra pagamento externo no admin e confere o lancamento no extrato.

Esses videos sao gerados a partir da suite `tests/tutorial/`, nao da suite `tests/e2e/`. Isso evita transformar testes de regressao em gravacoes lentas e evita transformar tutoriais em checks superficiais.

## Cenarios de erro para implementar depois

- Usuario sem sessao ve a tela de login e nao acessa rotas autenticadas.
- Usuario pendente ve bloqueio de aprovacao.
- Usuario bloqueado nao acessa o app.
- Upload de imagem acima do limite mostra erro claro.
- Upload de video em formato nao aceito mostra erro claro.
- Falha de rede ao postar mantem o modal aberto e mostra toast.
- Falha ao anexar comprovante nao altera status do pagamento.
- Admin tenta registrar pagamento externo sem comprovante e recebe validacao.
- Usuario comum nao ve aba Admin.
- Usuario comum nao aprova, rejeita ou exclui pagamentos.
- Merge de cadastro falha no backend e preserva os dois cadastros.
- Comentario vazio nao e enviado.
- Marcacao sem resultado mostra estado vazio sem quebrar o editor.
- Extrato sem lancamentos mostra estado vazio.
- Realtime indisponivel nao trava a navegacao nem multiplica polling.
