from pathlib import Path
import base64
import gzip
import hashlib
import re

repo = Path('.')
parts = [
    (repo / f'.github/intro-art-parts/part{index}.txt').read_text(encoding='utf-8').strip()
    for index in range(4)
]
svg = gzip.decompress(base64.b64decode(''.join(parts)))
expected_sha = '5522ab65c98be8e07f7ec11063baab713424c66b9ac579e7bb64f5dd15742147'
actual_sha = hashlib.sha256(svg).hexdigest()
if actual_sha != expected_sha:
    raise SystemExit(f'SVG inválido: {actual_sha}')

asset_path = repo / 'public/pdf-assets/illustrations/sua-energia-pode-trabalhar-a-favor-do-seu-patrimonio.svg'
asset_path.parent.mkdir(parents=True, exist_ok=True)
asset_path.write_bytes(svg)

module_path = repo / 'src/assets/pdf-art/introPatrimonyImage.ts'
module_path.write_text(
    "const introPatrimonyImage = `${import.meta.env.BASE_URL}pdf-assets/illustrations/sua-energia-pode-trabalhar-a-favor-do-seu-patrimonio.svg`;\n\n"
    "export { introPatrimonyImage };\n"
    "export default introPatrimonyImage;\n",
    encoding='utf-8',
)

engine_path = repo / 'src/lib/pdf/utils/illustrationColorEngine.ts'
engine = engine_path.read_text(encoding='utf-8')
engine = engine.replace(
    "import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';",
    "import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';\n"
    "import introPatrimonyImage from '../../../assets/pdf-art/introPatrimonyImage';",
    1,
)
engine = engine.replace(
    "export interface ProposalIllustrationImages {\n  kit: string;\n  timeline: string;\n  financial: string;\n}",
    "export interface ProposalIllustrationImages {\n  intro: string;\n  kit: string;\n  timeline: string;\n  financial: string;\n}",
    1,
)
engine = re.sub(
    r"export async function buildProposalIllustrationImages\([\s\S]*?export const defaultProposalIllustrationImages: ProposalIllustrationImages = \{[\s\S]*?\n\};",
    """export async function buildProposalIllustrationImages(
  theme: PdfDocumentTheme,
): Promise<ProposalIllustrationImages> {
  const [intro, kit, timeline, financial] = await Promise.all([
    applyPdfThemeToIllustration(introPatrimonyImage, theme, { outputWidth: 2200 }),
    applyPdfThemeToIllustration(kitEquipmentImage, theme, { outputWidth: 1800 }),
    applyPdfThemeToIllustration(
      implementationTimelineImage,
      theme,
      TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
    ),
    applyPdfThemeToIllustration(financialReturnImage, theme, { outputWidth: 1800 }),
  ]);

  return { intro, kit, timeline, financial };
}

export const defaultProposalIllustrationImages: ProposalIllustrationImages = {
  intro: introPatrimonyImage,
  kit: kitEquipmentImage,
  timeline: implementationTimelineImage,
  financial: financialReturnImage,
};""",
    engine,
    count=1,
)
engine_path.write_text(engine, encoding='utf-8')

render_path = repo / 'src/lib/pdf/renderProposalDocument.tsx'
render = render_path.read_text(encoding='utf-8')
render = render.replace(
    "  switch (previewPageKey) {\n    case 'kit':",
    "  switch (previewPageKey) {\n    case 'intro':\n"
    "      images.intro = await applyPdfThemeToIllustration(\n"
    "        images.intro,\n"
    "        resolvedTheme,\n"
    "        { outputWidth: 2200 },\n"
    "      );\n"
    "      break;\n"
    "    case 'kit':",
    1,
)
render_path.write_text(render, encoding='utf-8')

document_path = repo / 'src/components/pdf/ProposalDocument.tsx'
document = document_path.read_text(encoding='utf-8')
old_intro = """            case 'intro':
              return <React.Fragment key={page.key}><IntroPage proposal={proposal} pageNumber={pageNumber} /></React.Fragment>;"""
new_intro = """            case 'intro':
              return (
                <React.Fragment key={page.key}>
                  <IntroPage
                    proposal={proposal}
                    pageNumber={pageNumber}
                    illustration={illustrationImages.intro}
                  />
                </React.Fragment>
              );"""
if old_intro not in document:
    raise SystemExit('Contrato IntroPage não encontrado no ProposalDocument.')
document = document.replace(old_intro, new_intro, 1)
document_path.write_text(document, encoding='utf-8')

pages_path = repo / 'src/components/pdf/sections/ProposalPages.tsx'
pages = pages_path.read_text(encoding='utf-8')
pages = pages.replace(
    "export function IntroPage({ proposal, pageNumber }: { proposal: Proposal; pageNumber: number }) {",
    "export function IntroPage({ proposal, pageNumber, illustration }: { proposal: Proposal; pageNumber: number; illustration: string }) {",
    1,
)
intro_start = pages.index('export function IntroPage')
intro_end = pages.index('export function ConsumptionPage', intro_start)
intro_section = pages[intro_start:intro_end]
old_art = "          <ConsultationArt theme={theme} />"
new_art = """          <View
  style={[
    styles.card,
    {
      height: 285,
      padding: 10,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  ]}
>
  <Image src={illustration} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
</View>"""
if old_art not in intro_section:
    raise SystemExit('Arte genérica do resumo não encontrada.')
intro_section = intro_section.replace(old_art, new_art, 1)
pages = pages[:intro_start] + intro_section + pages[intro_end:]
pages_path.write_text(pages, encoding='utf-8')

preview_path = repo / 'src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx'
preview = preview_path.read_text(encoding='utf-8')
preview = preview.replace(
    "import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';",
    "import financialReturnImage from '../../../assets/pdf-art/financialReturnImage';\n"
    "import introPatrimonyImage from '../../../assets/pdf-art/introPatrimonyImage';",
    1,
)
intro_preview = r'''function IntroPreview({ theme, pageNumber }: Omit<ProposalPreviewPageProps, 'pageKey'>) {
  return (
    <PreviewPageFrame
      theme={theme}
      pageNumber={pageNumber}
      eyebrow="Uma decisão inteligente"
      title="Sua energia pode trabalhar a favor do seu patrimônio"
    >
      <div className="grid h-full min-h-0 grid-cols-[1.02fr_.98fr] gap-5">
        <div className="flex min-h-0 flex-col justify-between">
<p className="text-[11px] font-medium leading-relaxed" style={{ color: theme.muted }}>
  Dimensionamos uma solução para reduzir a energia comprada da distribuidora, proteger o orçamento contra reajustes e gerar economia por muitos anos.
</p>
<div className="grid grid-cols-2 gap-3">
  <Metric theme={theme} value="12,50 kWp" label="Potência instalada" compact />
  <Metric theme={theme} value="1.490 kWh" label="Geração média/mês" accent="secondary" compact />
  <Metric theme={theme} value="4 anos e 8 meses" label="Retorno estimado" accent="accent" compact />
  <Metric theme={theme} value="R$ 318 mil" label="Economia em 25 anos" compact />
</div>
        </div>
        <div className="flex min-h-0 flex-col gap-3.5">
<ArtStage
  source={introPatrimonyImage}
  theme={theme}
  label="Energia solar valorizando o imóvel"
  className="min-h-0 flex-1"
  outputWidth={2200}
/>
<div
  className="shrink-0 rounded-2xl p-4 text-[10px] font-semibold leading-relaxed"
  style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
>
  Uma solução equilibrada entre geração, segurança técnica, valorização patrimonial e retorno financeiro.
</div>
        </div>
      </div>
    </PreviewPageFrame>
  );
}

'''
marker = 'function KitPreview'
if marker not in preview:
    raise SystemExit('Ponto de inserção do IntroPreview não encontrado.')
preview = preview.replace(marker, intro_preview + marker, 1)
preview = preview.replace(
    "  switch (props.pageKey) {\n    case 'kit':",
    "  switch (props.pageKey) {\n    case 'intro': return <IntroPreview theme={props.theme} pageNumber={props.pageNumber} />;\n    case 'kit':",
    1,
)
preview_path.write_text(preview, encoding='utf-8')

test_path = repo / 'tests/pdf-intro-patrimony-art.test.ts'
test_path.write_text(r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(path, 'utf8');

test('a arte patrimonial substitui a ilustração genérica no resumo', async () => {
  const [asset, imageModule, engine, document, pages, preview, renderer] = await Promise.all([
    read('public/pdf-assets/illustrations/sua-energia-pode-trabalhar-a-favor-do-seu-patrimonio.svg'),
    read('src/assets/pdf-art/introPatrimonyImage.ts'),
    read('src/lib/pdf/utils/illustrationColorEngine.ts'),
    read('src/components/pdf/ProposalDocument.tsx'),
    read('src/components/pdf/sections/ProposalPages.tsx'),
    read('src/features/design-pdf/components/ProposalPagesPreviewWithVectorArt.tsx'),
    read('src/lib/pdf/renderProposalDocument.tsx'),
  ]);

  assert.match(asset, /<svg[^>]*viewBox="0 0 4777 3500"/);
  assert.match(asset, /#0076DD/i);
  assert.match(imageModule, /import\.meta\.env\.BASE_URL/);
  assert.match(engine, /intro: string/);
  assert.match(engine, /introPatrimonyImage/);
  assert.match(engine, /outputWidth: 2200/);
  assert.match(document, /illustration=\{illustrationImages\.intro\}/);
  assert.match(pages, /export function IntroPage\([\s\S]*illustration: string/);
  assert.match(pages, /<Image src=\{illustration\}/);
  assert.match(preview, /function IntroPreview/);
  assert.match(preview, /source=\{introPatrimonyImage\}/);
  assert.match(preview, /case 'intro': return <IntroPreview/);
  assert.match(renderer, /case 'intro'/);
  assert.match(renderer, /images\.intro/);
});
''', encoding='utf-8')

fidelity_path = repo / 'tests/pdf-preview-illustration-fidelity.test.ts'
fidelity = fidelity_path.read_text(encoding='utf-8')
fidelity = fidelity.replace(
    "  assert.match(assets, /case 'kit'/);",
    "  assert.match(assets, /case 'intro'/);\n  assert.match(assets, /case 'kit'/);",
    1,
)
fidelity_path.write_text(fidelity, encoding='utf-8')

flow_path = repo / 'tests/empty-proposal-flow-cover-only.test.ts'
flow = flow_path.read_text(encoding='utf-8')
flow = flow.replace(
    "  assert.match(document, /illustration=\\{illustrationImages\\.kit\\}/);",
    "  assert.match(document, /illustration=\\{illustrationImages\\.intro\\}/);\n"
    "  assert.match(document, /illustration=\\{illustrationImages\\.kit\\}/);",
    1,
)
flow = flow.replace(
    "test('as três ilustrações passam pelo mesmo pipeline de cores e alta resolução'",
    "test('as quatro ilustrações passam pelo mesmo pipeline de cores e alta resolução'",
    1,
)
flow_path.write_text(flow, encoding='utf-8')
