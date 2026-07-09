import { Check } from 'lucide-react';
import { PdfPageConfig } from '../types/pdfDesignTypes';

const pages = [
  { key: 'cover', label: 'Capa' },
  { key: 'intro', label: 'Introdução' },
  { key: 'technical', label: 'Técnico' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'payback', label: 'Payback' },
];

interface PageConfigEditorProps {
  pageConfig: PdfPageConfig;
  onChange: (pageConfig: PdfPageConfig) => void;
}

export function PageConfigEditor({ pageConfig, onChange }: PageConfigEditorProps) {
  const visiblePages = pageConfig.visiblePages || {};

  const togglePage = (key: string) => {
    const isVisible = visiblePages[key] !== false;

    onChange({
      ...pageConfig,
      visiblePages: {
        ...visiblePages,
        [key]: !isVisible,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-slate-100 font-semibold">Páginas do PDF</h3>
        <p className="text-xs text-slate-400 mt-1">Defina quais seções aparecem no modelo.</p>
      </div>

      {pages.map((page) => {
        const checked = visiblePages[page.key] !== false;
        return (
          <button
            key={page.key}
            type="button"
            onClick={() => togglePage(page.key)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-brand-border/60 bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <span className="text-slate-100 font-medium">{page.label}</span>
            <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${checked ? 'bg-brand-primary border-brand-primary text-white' : 'border-brand-border text-transparent'}`}>
              <Check className="w-4 h-4" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
