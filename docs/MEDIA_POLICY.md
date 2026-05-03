# Política de mídia

O aplicativo separa mídia social de documentos financeiros. Publicações, fotos de perfil e fotos de pets podem ser otimizadas para performance. Comprovantes de pagamento, recibos e documentos ficam no formato original para preservar fidelidade e auditoria.

## Imagens sociais

- Converter para WebP antes do upload.
- Limitar a maior dimensão a 1600px.
- Usar qualidade visual alta, em torno de 0.82.
- Manter o arquivo original fora do runtime depois que a versão otimizada for enviada.

Esse padrão vale para fotos de perfil, fotos de pets e imagens do mural.

## Comprovantes e recibos

- Não converter automaticamente.
- Preservar formato, metadados visuais e resolução enviada.
- Servir apenas por rota autenticada.

Esse padrão evita perda de legibilidade em comprovantes bancários, recibos e anexos administrativos.

## Vídeos do mural

- Aceitar MP4 com H.264/AAC.
- Limitar vídeos a 60 segundos e 50MB.
- Gerar uma capa WebP no cliente e salvar junto do post.
- Servir vídeos com suporte a HTTP Range para permitir seek e carregamento progressivo.
- Para MP4 convertido, usar H.264 Baseline 3.1, AAC-LC, `yuv420p`, `+faststart` e remover trilhas de dados/timecode.
- Declarar `codecs` no `<source>` somente quando o valor vier do arquivo final validado.

Esse padrão prioriza reprodução consistente em navegadores móveis e desktop.

Referências usadas para este padrão:

- Apple recomenda MP4 H.264 para arquivos estáticos no Safari.
- Safari tem suporte amplo a H.264 Baseline e áudio AAC em arquivos MP4.
- MDN recomenda MP4 com AVC/H.264 e AAC como combinação amplamente suportada.

## Mídias existentes

Conversões retroativas devem ser idempotentes:

- Baixar o objeto original do R2.
- Converter uma cópia.
- Validar que o arquivo convertido abre e tem tamanho maior que zero.
- Enviar a cópia otimizada para uma nova chave.
- Atualizar o D1 somente depois do upload validado.
- Manter o original no R2 até a validação manual.
