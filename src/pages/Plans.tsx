import { ArrowRight, Check, Info, Sparkles, Star, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    name: 'Gratuito',
    price: 'R$ 0',
    cadence: '/mês',
    eyebrow: 'Para começar',
    description: 'Conheça a plataforma e crie suas primeiras propostas comerciais.',
    features: [
      '5 propostas por mês',
      'Modelos básicos de capa',
      'Paletas de cores predefinidas',
      'Dimensionamento fotovoltaico',
      'Cálculo de economia e payback',
      'Geração de PDF e link público',
      '250 MB de armazenamento',
    ],
    cta: 'Começar gratuitamente',
    note: 'Identificação discreta SolAmigo nos documentos.',
  },
  {
    id: 'pro-monthly',
    name: 'Pro Mensal',
    price: 'R$ 100',
    cadence: '/mês',
    eyebrow: 'Para uso profissional',
    description: 'Mais liberdade visual e capacidade para sua rotina comercial.',
    features: [
      '30 propostas por mês',
      'Todos os modelos de capa',
      'Personalização completa das cores',
      'Editor avançado da proposta',
      'PDF sem marca SolAmigo',
      'Histórico completo',
      '10 GB de armazenamento',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro Mensal',
    note: 'Cancele quando precisar.',
  },
  {
    id: 'pro-annual',
    name: 'Pro Anual',
    price: 'R$ 1.000',
    cadence: '/ano',
    eyebrow: 'Mais vantagens',
    description: 'Economize no ano e receba uma franquia mensal maior.',
    features: [
      '40 propostas por mês',
      'Todos os recursos do Pro Mensal',
      '10 propostas extras todos os meses',
      'Economia de R$ 200 por ano',
      'Acesso antecipado a novos modelos',
      '10 GB de armazenamento',
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
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-[#0076DD] text-white shadow-sm">
        <Sun className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full bg-[#FACB5C]/90" />
      </span>
      <span className="text-xl font-extrabold tracking-[-0.035em] text-[#0E2337]">SolAmigo</span>
    </span>
  );
}

function PlanCard({ plan, destination }: { plan: Plan; destination: string; key?: string }) {
  return (
    <article
      id={plan.id}
      className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-[0_18px_50px_rgba(14,35,55,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(14,35,55,0.12)] sm:p-7 ${
        plan.featured
          ? 'border-[#0076DD] ring-4 ring-[#0076DD]/10 lg:-translate-y-2 lg:hover:-translate-y-3'
          : 'border-[#DCE7F1]'
      }`}
    >
      {plan.badge && (
        <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0076DD] px-3 py-1.5 text-xs font-bold text-white shadow-sm">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {plan.badge}
        </div>
      )}

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0076DD]">{plan.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0E2337]">{plan.name}</h2>
        <div className="mt-5 flex items-end gap-2">
          <span className="text-4xl font-black tracking-[-0.04em] text-[#0E2337] sm:text-5xl">{plan.price}</span>
          {plan.cadence && <span className="pb-1 text-sm font-medium text-[#5C7185]">{plan.cadence}</span>}
        </div>
        <p className="mt-4 min-h-12 text-sm leading-6 text-[#5C7185]">{plan.description}</p>
      </div>

      <div className="my-6 h-px bg-[#E5EDF4]" />

      <ul className="flex-1 space-y-3.5" aria-label={`Recursos do plano ${plan.name}`}>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-5 text-[#29445C]">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EAF4FF] text-[#0076DD]">
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
            ? 'border-2 border-[#0076DD] bg-white text-[#0076DD] hover:bg-[#F1F8FF]'
            : 'bg-[#0076DD] text-white shadow-[0_12px_24px_rgba(0,118,221,0.22)] hover:bg-[#005BB5]'
        }`}
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="mt-3 text-center text-xs leading-5 text-[#71859A]">{plan.note}</p>
    </article>
  );
}

export function Plans() {
  const { session } = useAuth();
  const freeDestination = session ? '/dashboard' : '/register';
  const paidDestination = session ? '/configuracoes' : '/register?intent=upgrade';

  return (
    <div className="min-h-screen bg-[#F7FAFD] text-[#0E2337]">
      <header className="sticky top-0 z-30 border-b border-[#E1EAF2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/planos" className="rounded-xl focus:outline-none focus:ring-4 focus:ring-[#64B0F3]/30">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#496176] md:flex" aria-label="Navegação principal">
            <a href="#beneficios" className="transition hover:text-[#0076DD]">Recursos</a>
            <a href="#planos" className="text-[#0076DD]" aria-current="page">Preços</a>
            <a href="#modelos" className="transition hover:text-[#0076DD]">Modelos</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={session ? '/dashboard' : '/login'}
              className="hidden rounded-lg px-3 py-2 text-sm font-bold text-[#29445C] transition hover:bg-[#F1F6FA] sm:inline-flex"
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

      <main>
        <section
          className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8"
          style={{
            backgroundImage:
              'radial-gradient(circle at 14% 10%, rgba(100,176,243,0.16), transparent 30%), radial-gradient(circle at 88% 28%, rgba(250,203,92,0.13), transparent 24%)',
          }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#CFE4F7] bg-white px-4 py-2 text-xs font-bold text-[#0076DD] shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Planos pensados para pequenos integradores
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.045em] text-[#0E2337] sm:text-5xl lg:text-6xl">
                Escolha o plano ideal para gerar propostas mais profissionais
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5C7185] sm:text-lg">
                Comece gratuitamente e evolua para mais personalização, mais propostas e uma apresentação mais profissional para seus clientes.
              </p>
              <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#D8E7F3] bg-white px-4 py-3 text-sm text-[#496176] shadow-sm">
                <span className="font-bold text-[#0E2337]">Pro Anual:</span>
                economize R$ 200 e receba 10 propostas extras por mês
              </div>
            </div>

            <div id="planos" className="mt-14 grid scroll-mt-24 gap-6 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  destination={plan.id === 'free' ? freeDestination : paidDestination}
                />
              ))}
            </div>

            <div className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-[#D8E7F3] bg-white px-5 py-4 text-sm leading-6 text-[#5C7185] shadow-sm">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0076DD]" aria-hidden="true" />
              <p>
                A contratação ainda será conectada ao checkout seguro. Você poderá alterar ou cancelar seu plano pela área de assinatura quando essa etapa for liberada.
              </p>
            </div>
          </div>
        </section>

        <section id="beneficios" className="border-t border-[#E1EAF2] bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {[
              ['Dimensione com segurança', 'Calcule potência, geração, economia e payback em um único fluxo.'],
              ['Apresente com qualidade', 'Use capas profissionais, identidade visual e documentos claros para o cliente.'],
              ['Venda com organização', 'Centralize clientes, propostas, custos, margem, lucro e aprovações.'],
            ].map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-[#E1EAF2] bg-[#FBFDFF] p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF4FF] text-sm font-black text-[#0076DD]">0{index + 1}</span>
                <h2 className="mt-5 text-lg font-extrabold text-[#0E2337]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5C7185]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modelos" className="border-t border-[#E1EAF2] bg-[#F7FAFD] px-4 py-14 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight text-[#0E2337]">Modelos que valorizam a sua marca</h2>
            <p className="mt-3 text-sm leading-6 text-[#5C7185]">
              O plano Pro libera a biblioteca completa de capas e a personalização avançada das propostas comerciais.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
