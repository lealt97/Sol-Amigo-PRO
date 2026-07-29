from pathlib import Path
import json

ROOT = Path('.')

def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text(encoding='utf-8')
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: trecho esperado encontrado {count} vezes')
    target.write_text(source.replace(old, new, 1), encoding='utf-8')

brand_dir = ROOT / 'public/brand/sol-amigo-pro'
variants = [
    ('icon-light.svg', 'icon-dark.svg', 'SA_PRO_icon_bg_claro', 'SA_PRO_icon_bg_escuro'),
    ('logo-horizontal-light.svg', 'logo-horizontal-dark.svg', 'SA_pro_bg_claro_horizontal', 'SA_pro_bg_escuro_horizontal'),
    ('logo-vertical-light.svg', 'logo-vertical-dark.svg', 'SA_pro_bg_claro_vertical', 'SA_pro_bg_escuro_vertical'),
]
for light_name, dark_name, light_id, dark_id in variants:
    source = (brand_dir / light_name).read_text(encoding='utf-8')
    dark = source.replace(light_id, dark_id).replace('fill="#0E2337"', 'fill="white"')
    (brand_dir / dark_name).write_text(dark, encoding='utf-8')

(ROOT / 'src/components/brand/BrandLogo.tsx').write_text("""import { useEffect, useState } from 'react';

export type BrandLogoFormat = 'horizontal' | 'vertical' | 'icon';
export type BrandLogoSurface = 'light' | 'dark' | 'auto';

type ResolvedSurface = Exclude<BrandLogoSurface, 'auto'>;

export const SOL_AMIGO_PRO_BRAND_ASSETS: Record<ResolvedSurface, Record<BrandLogoFormat, string>> = {
  light: {
    horizontal: '/brand/sol-amigo-pro/logo-horizontal-light.svg',
    vertical: '/brand/sol-amigo-pro/logo-vertical-light.svg',
    icon: '/brand/sol-amigo-pro/icon-light.svg',
  },
  dark: {
    horizontal: '/brand/sol-amigo-pro/logo-horizontal-dark.svg',
    vertical: '/brand/sol-amigo-pro/logo-vertical-dark.svg',
    icon: '/brand/sol-amigo-pro/icon-dark.svg',
  },
};

const readPlatformSurface = (): ResolvedSurface => (
  typeof document !== 'undefined'
    && document.documentElement.dataset.platformThemeMode === 'light'
    ? 'light'
    : 'dark'
);

function usePlatformSurface() {
  const [surface, setSurface] = useState<ResolvedSurface>(readPlatformSurface);

  useEffect(() => {
    const root = document.documentElement;
    const syncSurface = () => setSurface(readPlatformSurface());
    syncSurface();

    const observer = new MutationObserver(syncSurface);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-platform-theme-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return surface;
}

export type BrandLogoProps = {
  format?: BrandLogoFormat;
  surface?: BrandLogoSurface;
  className?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
};

export function BrandLogo({
  format = 'horizontal',
  surface = 'auto',
  className = '',
  alt = 'Sol Amigo PRO',
  loading = 'lazy',
}: BrandLogoProps) {
  const platformSurface = usePlatformSurface();
  const resolvedSurface = surface === 'auto' ? platformSurface : surface;
  const src = SOL_AMIGO_PRO_BRAND_ASSETS[resolvedSurface][format];

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      className={`block max-w-full select-none object-contain ${className}`.trim()}
    />
  );
}
""", encoding='utf-8')

(ROOT / 'src/components/brand/AnimatedNavbarLogo.tsx').write_text("""import { BrandLogo } from './BrandLogo';

type AnimatedNavbarLogoProps = { className?: string };

/** Compatibilidade com usos antigos: agora exibe o símbolo oficial compacto. */
export function AnimatedNavbarLogo({ className = '' }: AnimatedNavbarLogoProps) {
  return <BrandLogo format="icon" surface="auto" className={className} loading="eager" />;
}
""", encoding='utf-8')

(ROOT / 'src/components/brand/AnimatedLoginLogo.tsx').write_text("""import { BrandLogo } from './BrandLogo';

type AnimatedLoginLogoProps = { className?: string };

/** A autenticação utiliza a assinatura vertical oficial da Sol Amigo PRO. */
export function AnimatedLoginLogo({ className = '' }: AnimatedLoginLogoProps) {
  return <BrandLogo format="vertical" surface="auto" className={className} loading="eager" />;
}
""", encoding='utf-8')

replace_once('src/components/Layout.tsx', 'import { AnimatedNavbarLogo } from "./brand/AnimatedNavbarLogo";', 'import { BrandLogo } from "./brand/BrandLogo";')
replace_once('src/components/Layout.tsx', "  const displayCompany = navbarProfile?.company_name || user?.user_metadata?.company_name || 'SolAmigo Pro';", "  const displayCompany = navbarProfile?.company_name || user?.user_metadata?.company_name || 'Sol Amigo PRO';")
replace_once('src/components/Layout.tsx', '            <AnimatedNavbarLogo className={`${isSidebarExpanded ? "h-14 w-14" : "h-12 w-12"} shrink-0`} />', '''            <BrandLogo
              format={isSidebarExpanded ? 'horizontal' : 'icon'}
              surface="auto"
              className={isSidebarExpanded ? 'h-10 w-full max-w-[176px]' : 'h-11 w-11 shrink-0'}
              loading="eager"
            />''')
replace_once('src/components/Layout.tsx', '<span className="text-xs text-slate-500 hidden sm:block">SaaS SolAmigo FV</span>', '<span className="text-xs text-slate-500 hidden sm:block">Sol Amigo PRO · Propostas fotovoltaicas</span>')

replace_once('src/pages/Onboarding.tsx', "import { AnimatedNavbarLogo } from '../components/brand/AnimatedNavbarLogo';", "import { BrandLogo } from '../components/brand/BrandLogo';")
replace_once('src/pages/Onboarding.tsx', '''            <AnimatedNavbarLogo className="h-12 w-12" />
            <div>
              <p className="text-sm font-bold text-brand-dark">SolAmigo</p>
              <p className="text-xs text-slate-500">Configuração inicial da conta</p>
            </div>''', '''            <BrandLogo format="horizontal" surface="auto" className="h-10 w-auto max-w-[190px]" loading="eager" />
            <p className="hidden text-xs text-slate-500 sm:block">Configuração inicial da conta</p>''')

for page, form in [('Register', 'RegisterForm'), ('ForgotPassword', 'ForgotPasswordForm'), ('ResetPassword', 'ResetPasswordForm')]:
    (ROOT / f'src/pages/{page}.tsx').write_text(f"""import {{ BrandLogo }} from '../components/brand/BrandLogo';
import {{ {form} }} from '../components/auth/{form}';

export function {page}() {{
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-brand-gray p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="mx-auto w-full max-w-[220px] px-4">
          <BrandLogo format="horizontal" surface="auto" className="h-auto w-full" loading="eager" />
        </div>
        <{form} />
      </div>
    </div>
  );
}}
""", encoding='utf-8')

(ROOT / 'index.html').write_text("""<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0E2337" />
    <meta name="description" content="Sol Amigo PRO — propostas comerciais, dimensionamento e análise econômica para integradores fotovoltaicos." />
    <link rel="icon" type="image/svg+xml" href="/brand/sol-amigo-pro/icon-light.svg" />
    <link rel="manifest" href="/site.webmanifest" />
    <title>Sol Amigo PRO</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""", encoding='utf-8')

(ROOT / 'public/site.webmanifest').write_text(json.dumps({
    'name': 'Sol Amigo PRO', 'short_name': 'Sol Amigo PRO',
    'description': 'Propostas e dimensionamento fotovoltaico profissional.',
    'start_url': '/', 'display': 'standalone',
    'background_color': '#0E2337', 'theme_color': '#0E2337',
    'icons': [
        {'src': '/brand/sol-amigo-pro/icon-light.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any'},
        {'src': '/brand/sol-amigo-pro/icon-dark.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'monochrome'},
    ],
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

(ROOT / 'metadata.json').write_text(json.dumps({
    'name': 'Sol Amigo PRO',
    'description': 'SaaS para dimensionamento e geração de propostas comerciais profissionais para sistemas solares fotovoltaicos on-grid.',
    'requestFramePermissions': [],
    'majorCapabilities': ['MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'],
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

replace_once('src/pages/Plans.tsx', "import { ArrowRight, Check, Info, Sparkles, Star, Sun } from 'lucide-react';", "import { ArrowRight, Check, Info, Sparkles, Star } from 'lucide-react';")
replace_once('src/pages/Plans.tsx', "import { Link } from 'react-router-dom';\nimport { useAuth } from '../contexts/AuthContext';", "import { Link } from 'react-router-dom';\nimport { BrandLogo } from '../components/brand/BrandLogo';\nimport { useAuth } from '../contexts/AuthContext';")
replace_once('src/pages/Plans.tsx', '''function BrandMark() {
  return (
    <span className="flex items-center gap-2.5" aria-label="SolAmigo">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-[#0076DD] text-white shadow-[0_8px_24px_rgba(0,118,221,0.28)]">
        <Sun className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full bg-[#FACB5C]/90" />
      </span>
      <span
        data-testid="plans-brand-name"
        className="text-xl font-extrabold tracking-[-0.035em] text-[#FACB5C]"
      >
        SolAmigo
      </span>
    </span>
  );
}''', '''function BrandMark() {
  return (
    <span data-testid="plans-brand-name" className="flex items-center" aria-label="Sol Amigo PRO">
      <BrandLogo format="horizontal" surface="dark" className="h-9 w-auto max-w-[180px]" loading="eager" />
    </span>
  );
}''')

replace_once('src/pages/legal/LegalDocumentPage.tsx', "import { Link } from 'react-router-dom';\nimport { LEGAL_DOCUMENTS, LegalDocumentType } from '../../lib/legal/legalCatalog';", "import { Link } from 'react-router-dom';\nimport { BrandLogo } from '../../components/brand/BrandLogo';\nimport { LEGAL_DOCUMENTS, LegalDocumentType } from '../../lib/legal/legalCatalog';")
replace_once('src/pages/legal/LegalDocumentPage.tsx', '''      <div className="mx-auto max-w-4xl">
        <Link''', '''      <div className="mx-auto max-w-4xl">
        <BrandLogo format="horizontal" surface="dark" className="mb-6 h-10 w-auto" loading="eager" />
        <Link''')
replace_once('src/pages/legal/LegalDocumentPage.tsx', '<ArrowLeft className="h-4 w-4" /> Voltar ao SolAmigo', '<ArrowLeft className="h-4 w-4" /> Voltar à Sol Amigo PRO')

plans_test = ROOT / 'tests/plans-page.test.ts'
source = plans_test.read_text(encoding='utf-8')
source = source.replace('  assert.match(page, /data-testid="plans-brand-name"[\\s\\S]*text-\\[#FACB5C\\]/);', '  assert.match(page, /data-testid="plans-brand-name"[\\s\\S]*<BrandLogo[\\s\\S]*format="horizontal"[\\s\\S]*surface="dark"/);')
plans_test.write_text(source, encoding='utf-8')

e2e = ROOT / 'e2e/plans-page.spec.ts'
source = e2e.read_text(encoding='utf-8')
source = source.replace("    await expect(page.getByTestId('plans-brand-name')).toHaveCSS('color', 'rgb(250, 203, 92)');", "    await expect(page.getByTestId('plans-brand-name').getByRole('img', { name: 'Sol Amigo PRO' })).toBeVisible();")
e2e.write_text(source, encoding='utf-8')

(ROOT / 'tests/brand-logo-assets.test.ts').write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ASSETS = [
  'logo-horizontal-light.svg', 'logo-horizontal-dark.svg',
  'logo-vertical-light.svg', 'logo-vertical-dark.svg',
  'icon-light.svg', 'icon-dark.svg',
];

test('os seis arquivos oficiais da Sol Amigo PRO estão disponíveis', async () => {
  const files = await Promise.all(ASSETS.map((name) => readFile(`public/brand/sol-amigo-pro/${name}`, 'utf8')));
  files.forEach((source) => {
    assert.match(source, /<svg/);
    assert.match(source, /#FACB5C/);
  });
});

test('o componente central escolhe formato e contraste conforme o tema', async () => {
  const source = await readFile('src/components/brand/BrandLogo.tsx', 'utf8');
  assert.match(source, /SOL_AMIGO_PRO_BRAND_ASSETS/);
  assert.match(source, /data-platform-theme-mode/);
  assert.match(source, /MutationObserver/);
});

test('a marca oficial aparece nos principais pontos do produto', async () => {
  const [layout, login, plans, onboarding, index] = await Promise.all([
    readFile('src/components/Layout.tsx', 'utf8'),
    readFile('src/components/brand/AnimatedLoginLogo.tsx', 'utf8'),
    readFile('src/pages/Plans.tsx', 'utf8'),
    readFile('src/pages/Onboarding.tsx', 'utf8'),
    readFile('index.html', 'utf8'),
  ]);
  assert.match(layout, /format=\{isSidebarExpanded \? 'horizontal' : 'icon'\}/);
  assert.match(login, /format="vertical"/);
  assert.match(plans, /format="horizontal" surface="dark"/);
  assert.match(onboarding, /format="horizontal" surface="auto"/);
  assert.match(index, /brand\/sol-amigo-pro\/icon-light\.svg/);
});
""", encoding='utf-8')

for obsolete in [ROOT / 'public/brand/sa-logo-base.svg.gz.b64', ROOT / 'public/brand/sa-navbar-base.svg.gz.b64']:
    obsolete.unlink(missing_ok=True)
