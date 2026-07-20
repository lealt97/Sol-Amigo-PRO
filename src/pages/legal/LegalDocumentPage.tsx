import { ArrowLeft, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LEGAL_DOCUMENTS, LegalDocumentType } from '../../lib/legal/legalCatalog';

export function LegalDocumentPage({ type }: { type: LegalDocumentType }) {
  const document = LEGAL_DOCUMENTS[type];

  return (
    <main className="min-h-screen bg-[#0E2337] px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/planos"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#64B0F3] hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao SolAmigo
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl border border-[#2C527A] bg-[#142E46] shadow-2xl">
          <header className="border-b border-[#2C527A] px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#FACB5C]">
                  <Scale className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Documento legal versionado</span>
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-[#B4BF8A] sm:text-4xl">
                  {document.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{document.intro}</p>
              </div>
              <div className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
                <p className="font-bold">Revisão jurídica pendente</p>
                <p className="mt-1">Versão {document.version}</p>
              </div>
            </div>
            <p className="mt-5 text-xs text-slate-400">{document.effectiveLabel}</p>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-slate-50">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.bullets.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <footer className="border-t border-[#2C527A] px-6 py-5 text-xs leading-5 text-slate-400 sm:px-10">
            Esta minuta serve para homologação e beta controlado. A abertura comercial permanece bloqueada até revisão jurídica, definição do controlador, canal do titular, retenção e responsáveis formais.
          </footer>
        </article>
      </div>
    </main>
  );
}
