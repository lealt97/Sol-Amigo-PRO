# Arquitetura — Design PDF

O módulo oficial do Design PDF fica em `src/features/design-pdf` e é integrado à rota `/design-pdf` por `src/pages/design-pdf/DesignPdf.tsx`.

## Fluxo principal

1. `DesignPdfPage` carrega presets e modelos do usuário.
2. `TemplateCarousel` exibe os modelos padrão.
3. `UserModelCarousel` exibe os modelos salvos pelo usuário.
4. `DesignPdfEditor` edita nome, cores, imagens e páginas.
5. `PdfPreview` renderiza o SVG final em tempo real.
6. `svgTemplateEngine` aplica tema, textos, foto, logo e IDs únicos.

## Engines

- `colorEngine`: substitui cores conforme a paleta do modelo.
- `textEngine`: substitui textos dinâmicos da capa.
- `photoEngine`: aplica foto em SVGs com `cover-photo-layer` ou em templates antigos com `pattern`.
- `logoEngine`: injeta logo com transformação de posição, zoom e rotação.
- `idEngine`: evita conflito de IDs quando vários SVGs aparecem na mesma página.
- `svgTemplateEngine`: orquestra todos os engines.

## Compatibilidade com o PDF final

`src/lib/pdf/utils/coverSvgEngine.ts` foi mantido como adaptador de compatibilidade. Ele expõe a função antiga `buildCoverSvg`, mas internamente chama o novo `buildSvgTemplate`. Assim, preview e geração final usam o mesmo motor.

## Backend

O módulo continua usando os recursos existentes:

- tabela `pdf_user_models`
- bucket `pdf-assets`
- bucket `logos`
- pasta pública `public/pdf-assets/covers`
