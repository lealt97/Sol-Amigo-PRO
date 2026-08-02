import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Hammer,
  Image,
  LockKeyhole,
  PackageOpen,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import {
  getOrderedProposalPages,
  normalizeProposalPageConfig,
  type ProposalPageKey,
} from '../../../lib/pdf/proposalPageRegistry';
import { PdfPageConfig } from '../types/pdfDesignTypes';

interface PageConfigEditorProps {
  pageConfig: PdfPageConfig;
  activePageKey?: ProposalPageKey;
  onChange: (pageConfig: PdfPageConfig) => void;
  onNavigate?: (pageKey: ProposalPageKey) => void;
}

const pageIcons: Record<ProposalPageKey, LucideIcon> = {
  cover: FileText,
  intro: CheckCircle2,
  consumption: BarChart3,
  technical: Settings2,
  kit: PackageOpen,
  roof: Image,
  timeline: Hammer,
  financial: BadgeDollarSign,
  payback: TrendingUp,
  acceptance: ClipboardList,
};

export function PageConfigEditor({
  pageConfig,
  activePageKey,
  onChange,
  onNavigate,
}: PageConfigEditorProps) {
  const normalizedPageConfig = normalizeProposalPageConfig(pageConfig);
  const visiblePages = normalizedPageConfig.visiblePages || {};
  const pages = getOrderedProposalPages(normalizedPageConfig);

  const togglePage = (key: ProposalPageKey) => {
    if (key === 'cover') return;
    const isVisible = visiblePages[key] !== false;

    onChange({
      ...normalizedPageConfig,
      visiblePages: {
        ...visiblePages,
        [key]: !isVisible,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-100">Páginas da proposta</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Clique no nome de uma seção para navegar até ela no preview. Use o controle lateral para mostrar ou ocultar páginas.
        </p>
      </div>

      <div className="space-y-2.5">
        {pages.map((page, index) => {
          const checked = page.key === 'cover' || visiblePages[page.key] !== false;
          const active = activePageKey === page.key;
          const Icon = pageIcons[page.key];

          return (
            <div
              key={page.key}
              className={`group flex items-stretch overflow-hidden rounded-2xl border transition-all ${
                active
                  ? 'border-brand-primary bg-brand-primary/15 shadow-[0_0_0_1px_rgba(100,176,243,0.18)]'
                  : checked
                    ? 'border-brand-border/70 bg-white/5 hover:border-brand-primary/50 hover:bg-white/10'
                    : 'border-brand-border/40 bg-slate-950/25 opacity-60'
              }`}
            >
              <button
                type="button"
                disabled={!checked}
                onClick={() => checked && onNavigate?.(page.key)}
                className="flex min-w-0 flex-1 items-center gap-3 p-3.5 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-brand-primary text-white' : 'bg-white/8 text-slate-300'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {String(index + 1).padStart(2, '0')}. {page.label}
                    </span>
                    {page.optional && (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        opcional
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-slate-400">
                    {checked ? page.description : 'Ative esta página para visualizá-la no modelo.'}
                  </span>
                </span>
                {checked && <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />}
              </button>

              <div className="flex w-14 shrink-0 items-center justify-center border-l border-brand-border/50">
                {page.key === 'cover' ? (
                  <span title="A capa é obrigatória" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-400">
                    <LockKeyhole className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={`${checked ? 'Ocultar' : 'Exibir'} ${page.label}`}
                    onClick={() => togglePage(page.key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      checked
                        ? 'border-brand-primary bg-brand-primary'
                        : 'border-brand-border bg-slate-800'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
