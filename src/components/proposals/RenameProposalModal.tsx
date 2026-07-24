import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FilePenLine } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function RenameProposalModal({
  isOpen,
  initialTitle,
  isLoading,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  initialTitle: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (isOpen) setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const normalizedTitle = title.trim().replace(/\s+/g, ' ');
  const canSubmit = normalizedTitle.length >= 3 && normalizedTitle.length <= 120 && !isLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Fechar modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-proposal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-md rounded-xl border border-brand-border bg-brand-surface p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-blue/10 text-brand-blue">
                <FilePenLine className="h-5 w-5" />
              </span>
              <div>
                <h3 id="rename-proposal-title" className="text-lg font-bold text-brand-dark">Renomear proposta</h3>
                <p className="mt-1 text-sm text-slate-500">O novo nome será exibido na listagem e no histórico da proposta.</p>
              </div>
            </div>

            <label className="mt-6 block space-y-2">
              <span className="text-sm font-semibold text-brand-dark">Nome da proposta</span>
              <Input
                autoFocus
                value={title}
                maxLength={120}
                placeholder="Ex.: Sistema fotovoltaico — Residência Silva"
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canSubmit) onConfirm(normalizedTitle);
                }}
              />
              <span className="block text-right text-xs text-slate-500">{title.length}/120</span>
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button type="button" onClick={() => onConfirm(normalizedTitle)} disabled={!canSubmit} isLoading={isLoading}>
                Salvar nome
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
