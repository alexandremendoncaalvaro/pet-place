# Design System

O design system do Caixinha Pet Place é pragmático: tokens claros, poucos primitives e consistência visual suficiente para o app crescer sem virar uma coleção de telas desconexas.

As referências principais são:

- Apple Human Interface Guidelines para clareza, hierarquia visual e ergonomia móvel.
- IBM Carbon Design System para o uso disciplinado de tokens, papéis de cor e escalas de espaçamento.
- IBM 2x Grid para a base de espaçamento em múltiplos de 8px.

## Princípios

- Mobile-first: as telas principais precisam funcionar bem em viewport estreita.
- Utilitário, não promocional: o app é uma ferramenta de uso recorrente, então a UI deve ser calma, previsível e rápida de escanear.
- Uma fonte de verdade visual: cores, raios e sombras partem de tokens em `src/index.css`.
- Componentes antes de variações soltas: novos botões, campos, cards e badges devem usar primitives de `src/components/ui.tsx`.
- Sem superengenharia: criar primitive novo somente quando houver repetição real ou regra visual clara.

## Tokens

Os tokens vivem em `src/index.css` dentro de `@theme`.

### Cor

- `brand`: ações primárias, estados ativos, links e foco.
- `ink`: texto, bordas, superfícies neutras e navegação.
- `success`: estados aprovados ou em dia.
- `warning`: pendências e atenção.
- `danger`: erros, rejeições e ações destrutivas.

### Tipografia

- Família: Inter com fallback system-ui.
- Títulos compactos: `font-semibold` ou `font-bold`.
- Texto de UI: tamanhos `text-sm` e `text-xs` em áreas densas.
- Letter spacing: usar apenas em rótulos curtos uppercase, nunca em texto corrido.

### Espaçamento

- Base: 8px.
- Espaçamentos comuns: 8, 12, 16, 24 e 32px.
- Conteúdo mobile: `p-4` a `p-6`.
- Entre seções: `space-y-6`.

### Forma

- Cards: `rounded-card`, atualmente 24px.
- Controles: `rounded-control`, atualmente 16px.
- Ícones circulares: `rounded-full`.
- Evitar cards dentro de cards; preferir blocos internos com superfície neutra.

## Primitives

Arquivo: `src/components/ui.tsx`.

- `Button`: variantes `primary`, `secondary`, `ghost`, `danger`, `success`.
- `IconButton`: botão circular para ações por ícone.
- `Card`: superfície padrão de conteúdo.
- `Badge`: rótulos de status.
- `FieldLabel`: rótulos de formulário.
- `TextInput`: campo de texto padrão.
- `EmptyState`: estado vazio consistente.

## Uso Recomendado

```tsx
import { Button, Card, FieldLabel, TextInput } from './components/ui';

<Card className="p-6">
  <FieldLabel>Celular</FieldLabel>
  <TextInput placeholder="(47) 99999-9999" />
  <Button className="mt-4 w-full">Salvar</Button>
</Card>
```

## Checklist Para Novas Telas

- Usa primitives existentes antes de criar classe nova?
- Usa tokens `brand`, `ink`, `success`, `warning` ou `danger` em vez de cores soltas?
- Tem estado de foco visível?
- Tem estado disabled claro?
- Cabe em viewport mobile sem sobrepor texto?
- A ação primária é única e óbvia?
- Estados vazios explicam o que aconteceu sem parecer erro?

## Backlog Visual

- Migrar gradualmente `AdminPanel.tsx`, `ProfileView.tsx` e cards financeiros para primitives.
- Criar componentes compostos para `PageHeader`, `SectionTitle`, `StatusPill` e `FileDropzone` quando houver mais de dois usos claros.
- Adicionar screenshots de referência depois da validação manual do RC.
