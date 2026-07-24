from pathlib import Path


PATH = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


source = PATH.read_text(encoding='utf-8')

source = replace_once(source,
    "import { useNavigate, useParams, useSearchParams } from 'react-router-dom';",
    "import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';",
    'useLocation')
source = replace_once(source,
    "  const navigate = useNavigate();\n  const { user } = useAuth();\n  const { id: draftIdFromRoute } = useParams<{ id?: string }>();",
    "  const navigate = useNavigate();\n  const location = useLocation();\n  const { user } = useAuth();\n  const { id: draftIdFromRoute } = useParams<{ id?: string }>();\n  const isEditMode = location.pathname.endsWith('/editar');",
    'modo de edição')
source = replace_once(source,
    "  const [currentStep, setCurrentStep] = useState(0);\n  const [clients, setClients] = useState<Client[]>([]);",
    "  const [currentStep, setCurrentStep] = useState(0);\n  const [proposalTitle, setProposalTitle] = useState('');\n  const [clients, setClients] = useState<Client[]>([]);",
    'estado do nome')
source = replace_once(source,
    "  function hydrateProposalDraft(state: ProposalDraftState) {\n    setCurrentStep(clampProposalFlowStep(state.currentStep));\n    setSelectedClientId(state.selectedClientId);",
    "  function hydrateProposalDraft(state: ProposalDraftState, fallbackTitle = '', startAtBeginning = false) {\n    setCurrentStep(startAtBeginning ? 0 : clampProposalFlowStep(state.currentStep));\n    setProposalTitle(state.proposalTitle || fallbackTitle);\n    setSelectedClientId(state.selectedClientId);",
    'hidratação do nome')
source = replace_once(source,
    "        const proposal = await proposalService.getFlowDraftById(draftIdFromRoute);\n        if (!isProposalDraftState(proposal.flow_state)) {\n          throw new Error('O rascunho não possui um estado de fluxo compatível.');\n        }\n        if (!active) return;\n        setDraftId(proposal.id);\n        hydrateProposalDraft(proposal.flow_state);",
    "        const proposal = isEditMode\n          ? await proposalService.getEditableProposalById(draftIdFromRoute)\n          : await proposalService.getFlowDraftById(draftIdFromRoute);\n        if (!isProposalDraftState(proposal.flow_state)) {\n          throw new Error('A proposta não possui um estado de fluxo compatível.');\n        }\n        if (!active) return;\n        setDraftId(proposal.id);\n        hydrateProposalDraft(proposal.flow_state, proposal.title || '', isEditMode);",
    'carregamento por modo')
source = replace_once(source,
    "  }, [draftIdFromRoute, navigate]);",
    "  }, [draftIdFromRoute, isEditMode, navigate]);",
    'dependências do carregamento')
source = replace_once(source,
    "  const validateStep = () => {\n    if (currentStep === 0 && !selectedClient) {\n      toast.error('Selecione um cliente cadastrado.');\n      return false;\n    }",
    "  const validateStep = () => {\n    if (currentStep === 0) {\n      const normalizedTitle = proposalTitle.trim().replace(/\\s+/g, ' ');\n      if (normalizedTitle.length < 3) {\n        toast.error('Informe um nome para a proposta com pelo menos 3 caracteres.');\n        return false;\n      }\n      if (normalizedTitle.length > 120) {\n        toast.error('O nome da proposta deve ter no máximo 120 caracteres.');\n        return false;\n      }\n      if (!selectedClient) {\n        toast.error('Selecione um cliente cadastrado.');\n        return false;\n      }\n    }",
    'validação do nome')
source = replace_once(source,
    "    currentStep: step,\n    selectedClientId,",
    "    currentStep: step,\n    proposalTitle: proposalTitle.trim().replace(/\\s+/g, ' '),\n    selectedClientId,",
    'nome no estado')
source = replace_once(source,
    "      title: selectedClient ? `Proposta em elaboração — ${selectedClient.name}` : undefined,",
    "      title: proposalTitle.trim().replace(/\\s+/g, ' ') || (selectedClient ? `Proposta em elaboração — ${selectedClient.name}` : undefined),",
    'nome no resumo')
source = replace_once(source,
    "    if (!draftId) {\n      const outcome = await proposalService.createOrResumeFlowDraft({",
    "    if (isEditMode && draftId) {\n      await proposalService.saveCompletedProposal({\n        proposalId: draftId,\n        flowStep: nextStep,\n        flowState,\n        summary,\n      });\n      return false;\n    }\n\n    if (!draftId) {\n      const outcome = await proposalService.createOrResumeFlowDraft({",
    'salvamento no modo de edição')
source = replace_once(source,
    "        hydrateProposalDraft(outcome.proposal.flow_state);",
    "        hydrateProposalDraft(outcome.proposal.flow_state, outcome.proposal.title || '');",
    'retomada com nome')
source = replace_once(source,
    "      await proposalService.completeFlowDraft({\n        proposalId: draftId,\n        flowStep: STEPS.length - 1,\n        flowState,\n        summary: {\n          ...buildDraftSummary(),\n          title: selectedClient ? `Proposta solar — ${selectedClient.name}` : undefined,\n        },\n      });\n      toast.success('Proposta concluída e salva.');",
    "      const saveInput = {\n        proposalId: draftId,\n        flowStep: STEPS.length - 1,\n        flowState,\n        summary: {\n          ...buildDraftSummary(),\n          title: proposalTitle.trim().replace(/\\s+/g, ' '),\n        },\n      };\n\n      if (isEditMode) {\n        await proposalService.saveCompletedProposal(saveInput);\n        toast.success('Proposta atualizada com sucesso.');\n      } else {\n        await proposalService.completeFlowDraft(saveInput);\n        toast.success('Proposta concluída e salva.');\n      }",
    'conclusão ou atualização')
source = replace_once(source,
    "        <Loader2 className=\"h-5 w-5 animate-spin text-brand-blue\" /> Carregando rascunho da proposta...",
    "        <Loader2 className=\"h-5 w-5 animate-spin text-brand-blue\" /> {isEditMode ? 'Carregando proposta...' : 'Carregando rascunho da proposta...'}",
    'loading por modo')
source = replace_once(source,
    "<h1 className=\"text-2xl font-bold text-brand-dark\">{draftId ? 'Continuar Proposta' : 'Nova Proposta'}</h1>",
    "<h1 className=\"text-2xl font-bold text-brand-dark\">{isEditMode ? 'Editar Proposta' : draftId ? 'Continuar Proposta' : 'Nova Proposta'}</h1>",
    'título da página')
source = replace_once(source,
    "              : draftId\n                ? 'Rascunho salvo automaticamente'",
    "              : isEditMode\n                ? 'Alterações salvas no registro finalizado'\n                : draftId\n                  ? 'Rascunho salvo automaticamente'",
    'status da edição')
source = replace_once(source,
    "</div>\n\n                 {isLoadingClients ? (",
    "</div>\n\n                 <label className=\"block max-w-xl space-y-2\">\n                   <span className=\"text-sm font-semibold text-brand-dark\">Nome da proposta *</span>\n                   <Input\n                     type=\"text\"\n                     value={proposalTitle}\n                     maxLength={120}\n                     placeholder=\"Ex.: Sistema fotovoltaico — Residência Silva\"\n                     onChange={(event) => setProposalTitle(event.target.value)}\n                   />\n                   <span className=\"flex justify-between gap-4 text-xs text-slate-500\">\n                     <span>Este nome identifica a proposta na listagem e pode ser alterado depois.</span>\n                     <span className=\"shrink-0\">{proposalTitle.length}/120</span>\n                   </span>\n                 </label>\n\n                 {isLoadingClients ? (",
    'campo nome da proposta')
source = replace_once(source,
    "                  <Button type=\"button\" onClick={() => void completeSizing()} className=\"gap-2\" disabled={isSavingDraft}>\n                    Concluir dimensionamento <CheckCircle2 className=\"h-4 w-4\" />",
    "                  <Button type=\"button\" onClick={() => void completeSizing()} className=\"gap-2\" disabled={isSavingDraft}>\n                    {isEditMode ? 'Salvar alterações' : 'Concluir dimensionamento'} <CheckCircle2 className=\"h-4 w-4\" />",
    'botão final')

PATH.write_text(source, encoding='utf-8')
