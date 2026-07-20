import { ArrowRight, Check, Info, Sparkles, Star, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FREE_PLAN,
  PRO_ANNUAL,
  PRO_ANNUAL_SAVINGS_CENTS,
  PRO_MONTHLY,
} from '../lib/billing/planCatalog';

const PLAN_TEXTURE_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAAAZUlEQVRIie2RKw5AIQwEez0OgESQoBF8EgS32gu+bB2+6mXFZtIxFWNjDHBrrYeRznLO4OacOOc4o52VUsDx2Hs7o53de8H13lFrdUY74zeutYaUkjPamcIrvMIrvMIrvML/MvwHSWHL+QOXYmcAAAAASUVORK5CYII=';

const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

const formatPrice = (priceCents: number) => `R$ ${(priceCents / 100).toLocaleString('pt-BR', {
  maximumFractionDigits: 0,
})}`;

const formatStorage = (storageBytes: number) => {
  if (storageBytes >= GIBIBYTE) return `${storageBytes / GIBIBYTE} GB`;
  return `${storageBytes / MEBIBYTE} MB`;
};

const annualExtraProposals = PRO_ANNUAL.limits.proposalsPerMonth - PRO_MONTHLY.limits.proposalsPerMonth;

type Plan = {
  id: 'free' | 'pro-monthly' | 'pro-annual';
  name: string;
  price: string;
  cadence?: string;
  eyebrow: string;
  description: string;
  features: string[];
  cta: string;
  note: string;
  featured?: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    id: 'free',
    name: FREE_PLAN.name,
    price: formatPrice(FREE_PLAN.priceCents),
    cadence: '/mês',
    eyebrow: 'Para começar',
    description: 'Conheça a plataforma e crie suas primeiras propostas comerciais.',
    features: [
      `${FREE_PLAN.limits.proposalsPerMonth} propostas por mês`,
      'Modelos básicos de capa',
      'Paletas de cores predefinidas',
      'Dimensionamento fotovoltaico',
      'Cálculo de economia e payback',
      'Geração de PDF e link público',
      `${formatStorage(FREE_PLAN.limits.storageBytes)} de armazenamento`,
    ],
    cta: 'Começar gratuitamente',
    note: 'Identificação discreta SolAmigo nos documentos.',
  },
  {
    id: PRO_MONTHLY.id,
    name: 'Pro Mensal',
    price: formatPrice(PRO_MONTHLY.priceCents),
    cadence: '/mês',
    eyebrow: 'Para uso profissional',
    description: 'Mais liberdade visual e capacidade para sua rotina comercial.',
    features: [
      `${PRO_MONTHLY.limits.proposalsPerMonth} propostas por mês`,
      'Todos os modelos de capa',
      'Personalização completa das cores',
      'Editor avançado da proposta',
      'PDF sem marca SolAmigo',
      'Histórico completo',
      `${formatStorage(PRO_MONTHLY.limits.storageBytes)} de armazenamento`,
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro Mensal',
    note: 'Cancele quando precisar.',
  },
  {
    id: PRO_ANNUAL.id,
    name: 'Pro Anual',
    price: formatPrice(PRO_ANNUAL.priceCents),
    cadence: '/ano',
    eyebrow: 'Mais vantagens',
    description: 'Economize no ano e receba uma franquia mensal maior.',
    features: [
      `${PRO_ANNUAL.limits.proposalsPerMonth} propostas por mês`,
      'Todos os recursos do Pro Mensal',
      `${annualExtraProposals} propostas extras todos os meses`,
      `Economia de ${formatPrice(PRO_ANNUAL_SAVINGS_CENTS)} por ano`,
      'Acesso antecipado a novos modelos',
      `${formatStorage(PRO_ANNUAL.limits.storageBytes)} de armazenamento`,
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro Anual',
    note: 'Pagamento anual antecipado.',
    featured: true,
    badge: 'Melhor custo-benefício',
  },
];

function BrandMark() {
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
}

function PlanCard({ plan, destination }: { plan: Plan; destination: string; key?: string }) {
  return (
    <article
      id={plan.id}
      className={`relative flex h-full flex-col rounded-3xl border bg-[#142E46]/95 p-6 shadow-[0_22px_65px_rgba(0,0,0,0.28)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_78px_rgba(0,0,0,0.36)] sm:p-7 ${
        plan.featured
          ? 'border-[#0076DD] ring-4 ring-[#0076DD]/20 lg:-translate-y-2 lg:hover:-translate-y-3'
          : 'border-[#2C527A]'
      }`}
    >
      {plan.badge && (
        <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0076DD] px-3 py-1.5 text-xs font-bold text-white shadow-sm">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {plan.badge}
        </div>
      )}

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#64B0F3]">{plan.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#F8FAFC]">{plan.name}</h2>
        <div className="mt-5 flex items-end gap-2">
          <span className="text-4xl font-black tracking-[-0.04em] text-[#F8FAFC] sm:text-5xl">{plan.price}</span>
          {plan.cadence && <span className="pb-1 text-sm font-medium text-[#CBD5E1]">{plan.cadence}</span>}
        </div>
        <p className="mt-4 min-h-12 text-sm leading-6 text-[#CBD5E1]">{plan.description}</p>
      </div>

      <div className="my-6 h-px bg-[#2C527A]" />

      <ul className="flex-1 space-y-3.5" aria-label={`Recursos do plano ${plan.name}`}>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-5 text-[#E2E8F0]">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0076DD]/18 text-[#64B0F3]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to={destination}
        className={`mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-center text-sm font-extrabold transition focus:outline-none focus:ring-4 focus:ring-[#64B0F3]/35 ${
          plan.id === 'free'
            ? 'border-2 border-[#0076DD] bg-transparent text-[#64B0F3] hover:bg-[#0076DD]/12'
            : 'bg-[#0076DD] text-white shadow-[0_12px_24px_rgba(0,118,221,0.28)] hover:bg-[#005BB5]'
        }`}
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="mt-3 text-center text-xs leading-5 text-[#94A3B8]">{plan.note}</p>
    </article>
  );
}

export function Plans() {
  const { session } = useAuth();
  const freeDestination = session ? '/dashboard' : '/register';

  const getDestination = (plan: Plan) => {
    if (plan.id === 'free') return freeDestination;
    const interval = plan.id === PRO_ANNUAL.id ? 'year' : 'month';
    return session
      ? `/checkout?interval=${interval}`
      : `/register?intent=upgrade&interval=${interval}`;
  };

  return (
    <div
      data-testid="plans-page"
      className="relative min-h-screen overflow-hidden bg-[#0E2337] text-[#F8FAFC]"
    >
      <div
        data-testid="plans-texture"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage: `url(${PLAN_TEXTURE_DATA_URI})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '8px 8px',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[#1C3F5E] bg-[#0E2337]/94 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/planos" className="rounded-xl focus:outline-none focus:ring-4 focus:ring-[#64B0F3]/30">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#CBD5E1] md:flex" aria-label="Navegação principal">
            <a href="#beneficios" className="transition hover:text-[#FACB5C]">Recursos</a>
            <a href="#planos" className="text-[#64B0F3]" aria-current="page">Preços</a>
            <a href="#modelos" className="transition hover:text-[#FACB5C]">Modelos</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={session ? '/dashboard' : '/login'}
              className="hidden rounded-lg px-3 py-2 text-sm font-bold text-[#E2E8F0] transition hover:bg-[#142E46] sm:inline-flex"
            >
              {session ? 'Ir para plataforma' : 'Entrar'}
            </Link>
            <Link
              to={session ? '/dashboard' : '/register'}
              className="inline-flex min-h-10 items-center rounded-xl bg-[#0076DD] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#005BB5] focus:outline-none focus:ring-4 focus:ring-[#64B0F3]/35"
            >
              {session ? 'Minha conta' : 'Começar grátis'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section
          className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8"
          style={{
            backgroundImage:
              'radial-gradient(circle at 14% 10%, rgba(100,176,243,0.13), transparent 30%), radial-gradient(circle at 88% 28%, rgba(250,203,92,0.10), transparent 24%)',
          }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#2C527A] bg-[#142E46]/90 px-4 py-2 text-xs font-bold text-[#FACB5C] shadow-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Planos pensados para pequenos integradores
              </div>
              <h1
                data-testid="plans-title"
                className="mt-6 text-4xl font-black leading-tight tracking-[-0.045em] text-[#B4BF8A] sm:text-5xl lg:text-6xl"
              >
                Escolha o plano ideal para gerar propostas mais profissionais
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#D7E4EF] sm:text-lg">
                Comece gratuitamente e evolua para mais personalização, mais propostas e uma apresentação mais profissional para seus clientes.
              </p>
              <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#2C527A] bg-[#142E46]/90 px-4 py-3 text-sm text-[#D7E4EF] shadow-sm backdrop-blur-sm">
                <span className="font-bold text-[#FACB5C]">Pro Anual:</span>
                economize {formatPrice(PRO_ANNUAL_SAVINGS_CENTS)} e receba {annualExtraProposals} propostas extras por mês
              </div>
            </div>

            <div id="planos" className="mt-14 grid scroll-mt-24 gap-6 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  destination={getDestination(plan)}
                />
              ))}
            </div>

            <div className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-[#2C527A] bg-[#142E46]/90 px-5 py-4 text-sm leading-6 text-[#CBD5E1] shadow-sm backdrop-blur-sm">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#64B0F3]" aria-hidden="true" />
              <p>
                O checkout é iniciado somente após o login e usa uma sessão idempotente no servidor. O plano muda apenas depois da confirmação assinada do provedor de pagamento.
              </p>
            </div>
          </div>
        </section>

        <section id="beneficios" className="border-t border-[#1C3F5E] bg-[#0E2337]/76 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {[
              ['Dimensione com segurança', 'Calcule potência, geração, economia e payback em um único fluxo.'],
              ['Apresente com qualidade', 'Use capas profissionais, identidade visual e documentos claros para o cliente.'],
              ['Venda com organização', 'Centralize clientes, propostas, custos, margem, lucro e aprovações.'],
            ].map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-[#2C527A] bg-[#142E46]/92 p-6 shadow-[0_16px_42px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0076DD]/18 text-sm font-black text-[#64B0F3]">0{index + 1}</span>
                <h2 className="mt-5 text-lg font-extrabold text-[#F8FAFC]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modelos" className="border-t border-[#1C3F5E] bg-[#142E46]/72 px-4 py-14 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight text-[#B4BF8A]">Modelos que valorizam a sua marca</h2>
            <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
              O plano Pro libera a biblioteca completa de capas e a personalização avançada das propostas comerciais.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
