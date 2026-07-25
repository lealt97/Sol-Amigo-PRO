from pathlib import Path

path = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
source = path.read_text()

replacements = [
    (
        "import type { Client } from '../../types/client';\n",
        "import type { Client } from '../../types/client';\nimport type { Proposal } from '../../types/proposal';\n",
    ),
    (
        "import { PaybackStep } from './PaybackStep';\n",
        "import { ProposalDeliveryPanel } from '../../components/proposals/ProposalDeliveryPanel';\nimport { PaybackStep } from './PaybackStep';\n",
    ),
    (
        "  { id: 'result', title: 'Resultado' },\n] as const;",
        "  { id: 'result', title: 'Resultado' },\n  { id: 'delivery', title: 'Gerar e enviar' },\n] as const;",
    ),
    (
        "  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);\n",
        "  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);\n  const [completedProposal, setCompletedProposal] = useState<Proposal | null>(null);\n",
    ),
    (
        "    setPaybackResult(null);\n  }",
        "    setPaybackResult(null);\n    setCompletedProposal(null);\n  }",
    ),
    (
        "      if (isEditMode) {\n        await proposalService.saveCompletedProposal(saveInput);\n        toast.success('Proposta atualizada com sucesso.');\n      } else {\n        await proposalService.completeFlowDraft(saveInput);\n        toast.success('Proposta concluída e salva.');\n      }\n      navigate(`/propostas/${draftId}`, { replace: true });",
        "      const savedProposal = isEditMode\n        ? await proposalService.saveCompletedProposal(saveInput)\n        : await proposalService.completeFlowDraft(saveInput);\n      const proposalWithRelations = await proposalService.getProposalById(savedProposal.id);\n      setCompletedProposal(proposalWithRelations);\n      setCurrentStep(STEPS.length - 1);\n      toast.success(isEditMode ? 'Proposta atualizada. Agora escolha o modelo e envie.' : 'Proposta concluída. Agora gere e envie o PDF.');",
    ),
    (
        "            {currentStep === 6 && (",
        "            {currentStep === 6 && (",
    ),
]

for old, new in replacements:
    if old not in source:
        if old == "            {currentStep === 6 && (":
            continue
        raise SystemExit(f'Pattern not found: {old[:120]!r}')
    source = source.replace(old, new, 1)

result_end = """              </section>\n            )}\n\n            <div className=\"mt-8 flex justify-between border-t border-brand-border pt-6\">"""
delivery_block = """              </section>\n            )}\n\n            {currentStep === STEPS.length - 1 && (\n              completedProposal ? (\n                <ProposalDeliveryPanel proposal={completedProposal} onProposalChange={setCompletedProposal} />\n              ) : (\n                <ErrorState message=\"Conclua e salve a proposta antes de gerar o PDF e o link público.\" />\n              )\n            )}\n\n            <div className=\"mt-8 flex justify-between border-t border-brand-border pt-6\">"""
if result_end not in source:
    raise SystemExit('Result section footer anchor not found')
source = source.replace(result_end, delivery_block, 1)

old_footer = """              {currentStep < STEPS.length - 1 ? (\n                <Button type=\"button\" onClick={() => void goNext()} className=\"gap-2\" disabled={isSavingDraft}>\n                  Próximo <ArrowRight className=\"h-4 w-4\" />\n                </Button>\n              ) : (\n                <Button type=\"button\" onClick={() => void completeSizing()} className=\"gap-2\" disabled={isSavingDraft}>\n                  {isEditMode ? 'Salvar alterações' : 'Concluir dimensionamento'} <CheckCircle2 className=\"h-4 w-4\" />\n                </Button>\n              )}"""
new_footer = """              {currentStep < STEPS.length - 2 ? (\n                <Button type=\"button\" onClick={() => void goNext()} className=\"gap-2\" disabled={isSavingDraft}>\n                  Próximo <ArrowRight className=\"h-4 w-4\" />\n                </Button>\n              ) : currentStep === STEPS.length - 2 ? (\n                <Button type=\"button\" onClick={() => void completeSizing()} className=\"gap-2\" disabled={isSavingDraft}>\n                  {isEditMode ? 'Salvar e preparar envio' : 'Concluir e preparar envio'} <CheckCircle2 className=\"h-4 w-4\" />\n                </Button>\n              ) : (\n                <Button type=\"button\" variant=\"outline\" onClick={() => navigate(`/propostas/${draftId}`)} className=\"gap-2\">\n                  Ver detalhes da proposta <ArrowRight className=\"h-4 w-4\" />\n                </Button>\n              )}"""
if old_footer not in source:
    raise SystemExit('Footer pattern not found')
source = source.replace(old_footer, new_footer, 1)

path.write_text(source)

# Regression test focused on the final wizard integration.
test = Path('tests/proposal-delivery-wizard-step.test.ts')
test.write_text("""import assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nimport test from 'node:test';\n\nconst WIZARD = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';\n\ntest('entrega de proposta é a última etapa do wizard', async () => {\n  const source = await readFile(WIZARD, 'utf8');\n\n  assert.match(source, /\{ id: 'delivery', title: 'Gerar e enviar' \}/);\n  assert.match(source, /<ProposalDeliveryPanel proposal=\{completedProposal\}/);\n  assert.match(source, /setCurrentStep\(STEPS\.length - 1\)/);\n  assert.match(source, /Concluir e preparar envio/);\n  assert.match(source, /Escolha um modelo salvo em Meus modelos/);\n});\n""")
