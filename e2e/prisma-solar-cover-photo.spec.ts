import { expect, test } from '@playwright/test';

test('A4 12 rasteriza a foto dentro do prisma em vez de deixar a área branca', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const templateModule = await (0, eval)(
      'import("/src/features/design-pdf/engines/svgTemplateEngine.ts")',
    );
    const svgSource = await fetch('/pdf-assets/covers/A4%20-12.svg').then((response) => {
      if (!response.ok) throw new Error(`cover_http_${response.status}`);
      return response.text();
    });

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

    const renderedSvg = templateModule.buildSvgTemplate({
      svgSource,
      theme: { current: theme, original: theme },
      coverImageUrl: solidRedImage,
      coverImageTransform: { zoom: 1, x: 0, y: 0, rotate: 0 },
      modelId: 'prisma-render-test',
    });

    const blobUrl = URL.createObjectURL(
      new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' }),
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
        hasVisibleShape: renderedSvg.includes('data-prisma-solar-photo-shape="true"'),
        usesPatternCrop: renderedSvg.includes('data-pdf-image-mode="crop"'),
        usesFailedClipPathWorkaround: renderedSvg.includes('prisma-solar-mask-to-clip'),
      };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  });

  expect(result.hasVisibleShape).toBe(true);
  expect(result.usesPatternCrop).toBe(true);
  expect(result.usesFailedClipPathWorkaround).toBe(false);

  const [red, green, blue, alpha] = result.pixel;
  expect(red).toBeGreaterThan(220);
  expect(green).toBeLessThan(40);
  expect(blue).toBeLessThan(40);
  expect(alpha).toBeGreaterThan(240);
});
