import { expect, test } from '@playwright/test';

test('A4 12 usa o mesmo contrato de foto das demais capas e rasteriza o prisma', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const templateModule = await (0, eval)(
      'import("/src/features/design-pdf/engines/svgTemplateEngine.ts")',
    );

    const [prismaSource, referenceSource] = await Promise.all([
      fetch('/pdf-assets/covers/A4%20-12.svg').then((response) => {
        if (!response.ok) throw new Error(`prisma_cover_http_${response.status}`);
        return response.text();
      }),
      fetch('/pdf-assets/covers/A4%20-11.svg').then((response) => {
        if (!response.ok) throw new Error(`reference_cover_http_${response.status}`);
        return response.text();
      }),
    ]);

    const solidRedImage = [
      'data:image/svg+xml,',
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'
          + '<rect width="64" height="64" fill="#ff0000"/>'
          + '</svg>',
      ),
    ].join('');

    const theme = {
      primary: '#142637',
      secondary: '#79ADD9',
      accent: '#F8B51F',
      neutral: '#D9D9D9',
    };

    const render = (svgSource: string, modelId: string) => (
      templateModule.buildSvgTemplate({
        svgSource,
        theme: { current: theme, original: theme },
        coverImageUrl: solidRedImage,
        coverImageTransform: { zoom: 1, x: 0, y: 0, rotate: 0 },
        modelId,
      })
    );

    const prismaSvg = render(prismaSource, 'prisma-shared-contract-test');
    const referenceSvg = render(referenceSource, 'reference-shared-contract-test');

    const readMode = (svg: string) => (
      svg.match(/data-pdf-image-mode="([^"]+)"/)?.[1] || null
    );
    const readFit = (svg: string) => (
      svg.match(/data-pdf-image-fit="([^"]+)"/)?.[1] || null
    );

    const blobUrl = URL.createObjectURL(
      new Blob([prismaSvg], { type: 'image/svg+xml;charset=utf-8' }),
    );

    try {
      const image = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('generated_prisma_svg_failed_to_load'));
      });
      image.src = blobUrl;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = 595;
      canvas.height = 842;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('canvas_context_unavailable');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixel = Array.from(context.getImageData(300, 400, 1, 1).data);

      return {
        pixel,
        prismaMode: readMode(prismaSvg),
        referenceMode: readMode(referenceSvg),
        prismaFit: readFit(prismaSvg),
        referenceFit: readFit(referenceSvg),
        hasSharedLayer: prismaSvg.includes('cover-photo-layer_model_'),
        hasStandardizedSlot: prismaSvg.includes('data-photo-layout="standard-mask-slot"'),
        hasExclusiveWorkaround: /prisma-solar|data-prisma-solar/i.test(prismaSvg),
      };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  });

  expect(result.prismaMode).toBe('clip-layer');
  expect(result.prismaMode).toBe(result.referenceMode);
  expect(result.prismaFit).toBe('cover');
  expect(result.prismaFit).toBe(result.referenceFit);
  expect(result.hasSharedLayer).toBe(true);
  expect(result.hasStandardizedSlot).toBe(true);
  expect(result.hasExclusiveWorkaround).toBe(false);

  const [red, green, blue, alpha] = result.pixel;
  expect(red).toBeGreaterThan(220);
  expect(green).toBeLessThan(40);
  expect(blue).toBeLessThan(40);
  expect(alpha).toBeGreaterThan(240);
});
