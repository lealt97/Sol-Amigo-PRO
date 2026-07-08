# Padrão da área de foto das capas

As capas A4 usam o mesmo padrão técnico discutido para o SVG 7.

O motor `src/lib/pdf/utils/coverSvgEngine.ts` normaliza automaticamente a máscara antiga exportada do Figma para a estrutura:

```svg
<clipPath id="clip-foto-aqui" clipPathUnits="userSpaceOnUse">
  <path id="photo-mask" />
</clipPath>

<g id="cover-photo" clip-path="url(#clip-foto-aqui)" data-photo-mask="true" data-photo-bounds="x y width height">
  <g id="foto_aqui_placeholder">...</g>
  <g id="cover-photo-layer" data-dynamic-photo-layer="true"></g>
</g>
```

Quando o usuário envia uma imagem de capa, o sistema injeta a imagem dentro de `cover-photo-layer` e oculta o placeholder.

Esse padrão evita fundo branco/cinza fixo na área da foto e mantém a imagem sempre recortada pela máscara correta de cada capa.
