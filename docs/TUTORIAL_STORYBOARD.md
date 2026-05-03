# Roteiro dos tutoriais

Estes tutoriais sao gravacoes narrativas, nao testes de regressao. O objetivo e mostrar o Pet Place como uma pessoa usaria no cotidiano: abrir o app, publicar algo do espaco, marcar alguem ou um pet, registrar pagamentos fora do app e conferir a transparencia do caixa.

## Referencias usadas

- [Playwright Videos](https://playwright.dev/docs/videos): gravacao de video, tamanho fixo e anotacoes visuais de acoes.
- [Playwright Best Practices](https://playwright.dev/docs/best-practices): locators orientados ao usuario, assertions reais e testes resilientes.
- [Playwright Codegen](https://playwright.dev/docs/codegen): fluxo util para observar a interacao real antes de transformar em script.
- Guias atuais de demo de produto recomendam roteiro antes da gravacao, pausas naturais, cursor deliberado, callouts e legenda ou voz para orientar a pessoa assistindo.
- WebM com narracao usa audio Opus muxado por ffmpeg, mantendo os videos pequenos e compatíveis com navegadores modernos.

## Principios

- Dados sempre ficticios: `Tutor Azul`, `Tutor Laranja`, `Tutor Rosa`, `Pet Sol`, `Pet Lua`.
- Nada de nomes reais, fotos reais, pets reais ou comprovantes reais.
- Cada video conta uma historia completa, com comeco, acao principal e resultado.
- O texto da legenda explica a intencao, nao repete mecanicamente o clique.
- Testes E2E continuam rapidos; videos tutorial ficam em suite propria.

## Videos atuais

### 1. Post com imagem

Historia: uma pessoa foi ao Pet Place, tirou uma foto do encontro e quer compartilhar com a comunidade.

Roteiro:

1. Abrir nova publicacao.
2. Digitar um texto contextual.
3. Usar `@` para marcar `Tutor Laranja`.
4. Anexar uma imagem ficticia.
5. Conferir a previa.
6. Publicar.
7. Abrir comentarios e adicionar um comentario de exemplo.

Mensagem que o tutorial deve transmitir:

- Publicar imagem e simples.
- Marcacoes por `@` funcionam no texto, como em rede social.
- Comentarios ficam no proprio post.

### 2. Post com video

Historia: a pessoa gravou um video curto de um pet brincando no espaco e quer marcar o pet.

Roteiro:

1. Abrir nova publicacao.
2. Digitar texto com `@`.
3. Selecionar `Pet Lua`.
4. Anexar um MP4 curto de fixture.
5. Conferir previa do video.
6. Publicar e confirmar que o post mostra video e tag do pet.

Mensagem que o tutorial deve transmitir:

- Videos curtos sao aceitos.
- A marcacao de pet aparece como sugestao no editor.
- O feed mostra video e tag associada.

### 3. Pagamento externo e transparencia

Historia: alguem pagou pelo WhatsApp e o administrador precisa registrar sem obrigar a pessoa a entrar no app.

Roteiro:

1. Abrir Admin.
2. Entrar em Pessoas.
3. Abrir Pagamento externo.
4. Criar pessoa ficticia offline.
5. Informar telefone, pet, competencia e valor.
6. Anexar comprovante ficticio.
7. Registrar no caixa.
8. Abrir Extrato.
9. Ver entradas e saidas no mesmo periodo.

Mensagem que o tutorial deve transmitir:

- O app aceita pagamento recebido fora do fluxo normal.
- O registro continua transparente.
- O extrato mostra entradas e saidas da comunidade.

## Voz sintetizada

A narracao local usa a voz `Microsoft Maria Desktop` quando disponivel no Windows. Ela e gratuita e local, mas deve ser tratada como rascunho de documentacao. Se a qualidade nao ficar boa para portfolio publico, manter os videos com legendas ou gravar voz humana depois.

Comando:

```powershell
npm run test:e2e:tutorial
npm run tutorial:narrate
```

Saidas geradas:

- `docs/tutorials/generated/01-post-com-imagem-narrado.webm`
- `docs/tutorials/generated/02-post-com-video-narrado.webm`
- `docs/tutorials/generated/03-pagamento-e-transparencia-narrado.webm`
