from pathlib import Path

# Este arquivo também funciona como gatilho explícito do workflow temporário.
ROOT = Path(__file__).resolve().parents[2]


def update(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text(encoding='utf-8')
    if old not in source:
        raise RuntimeError(f'Marcador não encontrado em {path}: {old!r}')
    target.write_text(source.replace(old, new, 1), encoding='utf-8')


update(
    'src/types/proposalDraft.ts',
    "import type { ElectricalStandardId } from '../lib/calculations/electricalStandards';",
    "import type { ElectricalStandardId } from '../lib/calculations/electricalStandards';\nimport type { PaybackResult } from '../lib/calculations/payback';",
)
update(
    'src/types/proposalDraft.ts',
    "  paybackForm: ProposalDraftPaybackForm | null;\n  selectedPdfModelId?: string;",
    "  paybackForm: ProposalDraftPaybackForm | null;\n  paybackResult?: PaybackResult | null;\n  selectedPdfModelId?: string;",
)
update(
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    "    setPaybackForm(state.paybackForm);\n    setSelectedPdfModelId(state.selectedPdfModelId || '');\n    setDeliveryCompleted(false);\n    setPaybackResult(null);",
    "    setPaybackForm(state.paybackForm);\n    setSelectedPdfModelId(state.selectedPdfModelId || '');\n    setDeliveryCompleted(false);\n    setPaybackResult(state.paybackResult || null);",
)
update(
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    "    paybackForm,\n    selectedPdfModelId,",
    "    paybackForm,\n    paybackResult,\n    selectedPdfModelId,",
)
update(
    'src/components/proposals/ProposalDeliveryPanel.tsx',
    "      if (!targetProposal && onPrepareProposal) {\n        targetProposal = await onPrepareProposal();\n      }\n      if (!targetProposal) throw new Error('Não foi possível preparar a proposta para gerar o PDF.');",
    "      if (!targetProposal && onPrepareProposal) {\n        targetProposal = await onPrepareProposal();\n        setWorkingProposal(targetProposal);\n        onProposalChange?.(targetProposal);\n      }\n      if (!targetProposal) throw new Error('Não foi possível preparar a proposta para gerar o PDF.');",
)
update(
    'tests/proposal-draft-flow.test.ts',
    "  assert.match(calculator, /paybackForm,/);\n  assert.match(calculator, /selectedPdfModelId,/);",
    "  assert.match(calculator, /paybackForm,/);\n  assert.match(calculator, /paybackResult,/);\n  assert.match(calculator, /selectedPdfModelId,/);",
)

print('Retomada e nova tentativa da entrega reforçadas.')
