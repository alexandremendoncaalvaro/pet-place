# Politica de midia

O aplicativo separa midia social de documentos financeiros. Publicacoes, fotos de perfil e fotos de pets podem ser otimizadas para performance. Comprovantes de pagamento, recibos e documentos ficam no formato original para preservar fidelidade e auditoria.

## Imagens sociais

- Converter para WebP antes do upload.
- Limitar a maior dimensao a 1600px.
- Usar qualidade visual alta, em torno de 0.82.
- Manter o arquivo original fora do runtime depois que a versao otimizada for enviada.

Esse padrao vale para fotos de perfil, fotos de pets e imagens do mural.

## Comprovantes e recibos

- Nao converter automaticamente.
- Preservar formato, metadados visuais e resolucao enviada.
- Servir apenas por rota autenticada.

Esse padrao evita perda de legibilidade em comprovantes bancarios, recibos e anexos administrativos.

## Videos do mural

- Aceitar apenas MP4 e WebM no upload direto para R2.
- Limitar videos a 60 segundos e 50MB.
- Gerar uma capa WebP no cliente e salvar junto do post.
- Servir videos com suporte a HTTP Range para permitir seek e carregamento progressivo.

Arquivos MOV/QuickTime podem usar codecs que o navegador nao reproduz de forma consistente. Quando o projeto adotar Cloudflare Stream, esse fluxo pode passar a aceitar MOV porque o Stream faz transcodificacao e entrega adaptativa.

## Midias existentes

Conversoes retroativas devem ser idempotentes:

- Baixar o objeto original do R2.
- Converter uma copia.
- Validar que o arquivo convertido abre e tem tamanho maior que zero.
- Enviar a copia otimizada para uma nova chave.
- Atualizar o D1 somente depois do upload validado.
- Manter o original no R2 ate a validacao manual.
