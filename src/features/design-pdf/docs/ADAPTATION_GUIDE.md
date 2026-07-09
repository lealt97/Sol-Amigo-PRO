# Guia de adaptação — Design PDF

Este módulo foi organizado para poder ser reaproveitado em outros projetos mantendo a mesma experiência do usuário.

## Arquivos centrais para copiar

- `src/features/design-pdf`
- `src/services/pdfModelService.ts`
- `src/services/pdfA4Presets.ts`
- `src/types/pdfModels.ts`
- `src/lib/pdf/utils/coverSvgEngine.ts`
- `public/pdf-assets/covers`

## Dependências esperadas

- React
- Vite
- Tailwind
- Supabase client
- `lucide-react`
- `sonner`
- `@radix-ui/react-dropdown-menu`

## Pontos que normalmente precisam adaptação

- `useAuth`
- `profileService`
- `logoHelper`
- componentes UI em `src/components/ui`
- cliente Supabase em `src/lib/supabase/client.ts`
- nomes dos buckets de Storage
- schema da tabela `pdf_user_models`

## Contrato dos SVGs

Para compatibilidade total, os SVGs devem preferencialmente conter:

- elemento ou grupo com `id` contendo `logo`
- grupo `cover-photo`
- grupo `cover-photo-layer`
- atributo `data-photo-bounds="x y width height"`
- placeholders de texto como `Nome do Cliente`, `0,00 kWp`, `Cidade - Estado` e `DD/MM/AA`

Templates antigos baseados em `pattern` continuam funcionando pelo fallback do `photoEngine`.
