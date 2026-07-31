import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Gauge,
  ListChecks,
  Loader2,
  PackageCheck,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { technicalNumber as number } from '../../lib/formatters/technicalNumber';
import { parseConsumptionKwhInput } from '../../lib/formatters/parseConsumptionKwhInput';
import {
  buildMonthlyConsumptionSeries,
  calculateLoadMonthlyConsumptionKwh,
  CONSUMPTION_MODE_LABELS,
  resolveAverageMonthlyConsumptionKwh,
  type ConsumptionMode,
  type LoadSurveyInput,
} from '../../lib/calculations/consumptionModes';
import {
  calculateProfessionalSizing,
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
  type ProfessionalSizingResult,
} from '../../lib/calculations/professionalSizing';
import { calculateRoofOrientation, type RoofOrientationResult } from '../../lib/calculations/roofOrientation';
import {
  calculateModuleSizing,
  type ModuleSizingResult,
} from '../../lib/calculations/moduleSizing';
import { calculateElectricalCompatibility } from '../../lib/calculations/electricalCompatibility';
import {
  ELECTRICAL_STANDARD_OPTIONS,
  getElectricalStandard,
  inferElectricalStandardId,
  type ElectricalStandardId,
} from '../../lib/calculations/electricalStandards';
import type { PaybackResult } from '../../lib/calculations/payback';
import { clampProposalFlowStep, getProposalContinuePath } from '../../lib/proposals/flow';
import { clientService } from '../../services/clientService';
import { proposalService, type ProposalFlowSummary } from '../../services/proposalService';
import { solarKitService } from '../../services/solarKitService';
import type { Client } from '../../types/client';
import type { Proposal } from '../../types/proposal';
import {
  PROPOSAL_DRAFT_VERSION,
  isProposalDraftState,
  type ProposalDraftPaybackForm,
  type ProposalDraftRoofPlane,
  type ProposalDraftState,
} from '../../types/proposalDraft';
import {
  SOLAR_KIT_CONNECTION_TYPE_LABELS,
  buildSolarKitSnapshot,
  type SolarKit,
} from '../../types/solarKit';
import { ProposalDeliveryPanel } from '../../components/proposals/ProposalDeliveryPanel';
import { PaybackStep } from './PaybackStep';
import { RoofPhotoUpload } from './RoofPhotoUpload';
import { RoofPlanesEditor, createRoofPlaneDraft } from './RoofPlanesEditor';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'modules', title: 'Telhado (opcional)' },
  { id: 'kit', title: 'Kit de referência (opcional)' },
  { id: 'payback', title: 'Preço e payback' },
  { id: 'result', title: 'Resultado' },
  { id: 'delivery', title: 'Gerar e enviar' },
] as const;

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return Number.NaN;
  return Number(normalized);
};

const parseOptionalNumber = (value: string) => {
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type LoadSurveyDraft = {
  id: string;
  equipmentName: string;
  powerWatts: string;
  quantity: string;
  hoursPerDay: string;
  daysPerWeek: string;
};

const createLoadDraft = (): LoadSurveyDraft => ({
  id: `load-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  equipmentName: '',
  powerWatts: '',
  quantity: '1',
  hoursPerDay: '',
  daysPerWeek: '7',
});

const toLoadInput = (draft: LoadSurveyDraft): LoadSurveyInput => ({
  equipmentName: draft.equipmentName,
  powerWatts: parseNumber(draft.powerWatts),
  quantity: parseNumber(draft.quantity),
  hoursPerDay: parseNumber(draft.hoursPerDay),
  daysPerWeek: parseNumber(draft.daysPerWeek),
});

function Field({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = '0.01',
  helper,
  type = 'number',
  inputMode,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string;
  helper?: string;
  type?: 'number' | 'text';
  inputMode?: 'decimal' | 'numeric';
  onBlur?: () => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-brand-dark">{label}</span>
      <div className="relative">
        <Input
          type={type}
          value={value}
          min={type === 'number' ? min : undefined}
          max={type === 'number' ? max : undefined}
          step={type === 'number' ? step : undefined}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={suffix ? 'pr-20' : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-xs leading-5 text-slate-500">{helper}</p>}
    </label>
  );
}

export function ProfessionalSizingCalculator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id: draftIdFromRoute } = useParams<{ id?: string }>();
  const isEditMode = location.pathname.endsWith('/editar');
  const [searchParams] = useSearchParams();
  const clientIdFromQuery = searchParams.get('clienteId') || '';

  const [draftId, setDraftId] = useState<string | null>(draftIdFromRoute || null);
  const [isHydratingDraft, setIsHydratingDraft] = useState(Boolean(draftIdFromRoute));
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [proposalTitle, setProposalTitle] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromQuery);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [consumptionMode, setConsumptionMode] = useState<ConsumptionMode>('history');
  const [directAverageConsumption, setDirectAverageConsumption] = useState('');
  const [committedDirectAverageConsumption, setCommittedDirectAverageConsumption] = useState('');
  const [monthlyConsumption, setMonthlyConsumption] = useState<string[]>(
    () => Array.from({ length: 12 }, () => ''),
  );
  const [loadSurvey, setLoadSurvey] = useState<LoadSurveyDraft[]>([createLoadDraft()]);
  const [electricalStandardId, setElectricalStandardId] = useState<ElectricalStandardId>('monophase_127');

  const [hspDaily, setHspDaily] = useState('');
  const [performanceRatioPercent, setPerformanceRatioPercent] = useState('80');
  const [generationIncreasePercent, setGenerationIncreasePercent] = useState('0');

  // Mantidos no rascunho para compatibilidade com propostas antigas.
  // Os valores atuais são sincronizados automaticamente com o kit selecionado.
  const [modulePowerW, setModulePowerW] = useState('275');
  const [moduleWidthM, setModuleWidthM] = useState('');
  const [moduleHeightM, setModuleHeightM] = useState('');
  const [roofAreaM2, setRoofAreaM2] = useState('');
  const [siteLatitudeDegrees, setSiteLatitudeDegrees] = useState('-20');
  const [roofPlanes, setRoofPlanes] = useState<ProposalDraftRoofPlane[]>([createRoofPlaneDraft(0)]);

  const [kits, setKits] = useState<SolarKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [paybackResult, setPaybackResult] = useState<PaybackResult | null>(null);
  const [paybackForm, setPaybackForm] = useState<ProposalDraftPaybackForm | null>(null);
  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);
  const [completedProposal, setCompletedProposal] = useState<Proposal | null>(null);

  const selectedElectricalStandard = getElectricalStandard(electricalStandardId);
  const connectionType = selectedElectricalStandard.connectionType;
  const gridVoltageV = String(selectedElectricalStandard.referenceVoltageV);

  function hydrateProposalDraft(state: ProposalDraftState, fallbackTitle = '', startAtBeginning = false) {
    setCurrentStep(startAtBeginning ? 0 : clampProposalFlowStep(state.currentStep));
    setProposalTitle(state.proposalTitle || fallbackTitle);
    setSelectedClientId(state.selectedClientId);
    setConsumptionMode(state.consumptionMode as ConsumptionMode);
    setDirectAverageConsumption(state.directAverageConsumption);
    setCommittedDirectAverageConsumption(state.directAverageConsumption);
    setMonthlyConsumption(state.monthlyConsumption.length === 12
      ? state.monthlyConsumption
      : Array.from({ length: 12 }, (_, index) => state.monthlyConsumption[index] || ''));
    setLoadSurvey(state.loadSurvey.length > 0 ? state.loadSurvey : [createLoadDraft()]);
    setElectricalStandardId(
      state.electricalStandardId
        ?? inferElectricalStandardId(
          state.connectionType as ConnectionType,
          parseOptionalNumber(state.gridVoltageV || ''),
        ),
    );
    setHspDaily(state.hspDaily);
    setPerformanceRatioPercent(state.performanceRatioPercent);
    setGenerationIncreasePercent(state.generationIncreasePercent);
    setModulePowerW(state.modulePowerW);
    setModuleWidthM(state.moduleWidthM);
    setModuleHeightM(state.moduleHeightM);
    setRoofAreaM2(state.roofAreaM2);
    setSiteLatitudeDegrees(state.siteLatitudeDegrees || '-20');
    setRoofPlanes(state.roofPlanes?.length
      ? state.roofPlanes
      : [createRoofPlaneDraft(0, state.roofAreaM2)]);
    setRoofPhotoReference(state.roofPhotoReference);
    setSelectedKitId(state.selectedKitId);
    setPaybackForm(state.paybackForm);
    setPaybackResult(null);
    setCompletedProposal(null);
  }

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoadingClients(true);
        setClientsError(null);
        setClients(await clientService.getClients());
      } catch (error) {
        setClientsError(error instanceof Error ? error.message : 'Erro ao carregar os clientes cadastrados.');
      } finally {
        setIsLoadingClients(false);
      }
    };

    void loadClients();
  }, []);

  useEffect(() => {
    const loadKits = async () => {
      try {
        setIsLoadingKits(true);
        setKitsError(null);
        const activeKits = await solarKitService.getActiveKits();
        setKits(activeKits.filter((kit) => kit.system_type === 'on_grid' && kit.kit_power_kwp > 0));
      } catch (error) {
        setKitsError(error instanceof Error ? error.message : 'Erro ao carregar os kits cadastrados.');
      } finally {
        setIsLoadingKits(false);
      }
    };

    void loadKits();
  }, []);

  useEffect(() => {
    if (!draftIdFromRoute) {
      setIsHydratingDraft(false);
      return undefined;
    }

    let active = true;
    const loadDraft = async () => {
      try {
        setIsHydratingDraft(true);
        const proposal = isEditMode
          ? await proposalService.getEditableProposalById(draftIdFromRoute)
          : await proposalService.getFlowDraftById(draftIdFromRoute);
        if (!isProposalDraftState(proposal.flow_state)) {
          throw new Error('A proposta não possui um estado de fluxo compatível.');
        }
        if (!active) return;
        setDraftId(proposal.id);
        hydrateProposalDraft(proposal.flow_state, proposal.title || '', isEditMode);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o rascunho.');
        navigate('/propostas', { replace: true });
      } finally {
        if (active) setIsHydratingDraft(false);
      }
    };

    void loadDraft();
    return () => {
      active = false;
    };
  }, [draftIdFromRoute, isEditMode, navigate]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const selectedKit = useMemo(
    () => kits.find((kit) => kit.id === selectedKitId) ?? null,
    [kits, selectedKitId],
  );

  useEffect(() => {
    if (!selectedKit) return;
    setModulePowerW(String(selectedKit.module_power_w || ''));
    setModuleHeightM(selectedKit.module_height_m ? String(selectedKit.module_height_m) : '');
    setModuleWidthM(selectedKit.module_width_m ? String(selectedKit.module_width_m) : '');
  }, [selectedKit]);

  const selectedKitElectricalCompatibility = useMemo(() => {
    if (!selectedKit) return null;

    return calculateElectricalCompatibility({
      customerConnectionType: connectionType,
      customerVoltagesV: selectedElectricalStandard.availableVoltagesV,
      kitConnectionType: selectedKit.grid_connection_type ?? null,
      kitVoltageV: selectedKit.grid_voltage_v ?? null,
    });
  }, [connectionType, selectedElectricalStandard, selectedKit]);

  const consumptionModeInput = useMemo(() => ({
    mode: consumptionMode,
    directAverageMonthlyKwh: parseConsumptionKwhInput(committedDirectAverageConsumption),
    monthlyHistoryKwh: monthlyConsumption.map(parseConsumptionKwhInput),
    loads: loadSurvey.map(toLoadInput),
  }), [committedDirectAverageConsumption, consumptionMode, loadSurvey, monthlyConsumption]);

  const consumptionResolution = useMemo(() => {
    try {
      const averageMonthlyConsumptionKwh = resolveAverageMonthlyConsumptionKwh(consumptionModeInput);
      return {
        averageMonthlyConsumptionKwh,
        monthlySeries: buildMonthlyConsumptionSeries(consumptionModeInput),
        error: null,
      };
    } catch (error) {
      return {
        averageMonthlyConsumptionKwh: null,
        monthlySeries: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular o consumo mensal.',
      };
    }
  }, [consumptionModeInput]);

  const consumptionPreview = useMemo(() => {
    const averageMonthlyConsumptionKwh = consumptionResolution.averageMonthlyConsumptionKwh;
    if (averageMonthlyConsumptionKwh == null) return null;

    const availabilityConsumptionKwh = CONNECTION_AVAILABILITY_KWH[connectionType];
    return {
      sourceLabel: CONSUMPTION_MODE_LABELS[consumptionMode],
      annualConsumptionKwh: averageMonthlyConsumptionKwh * 12,
      averageMonthlyConsumptionKwh,
      availabilityConsumptionKwh,
      compensableMonthlyConsumptionKwh: Math.max(
        averageMonthlyConsumptionKwh - availabilityConsumptionKwh,
        0,
      ),
    };
  }, [connectionType, consumptionMode, consumptionResolution.averageMonthlyConsumptionKwh]);

  const roofOrientationCalculation = useMemo<{ result: RoofOrientationResult | null; error: string | null }>(() => {
    try {
      const configuredPlanes = roofPlanes.filter((plane) => plane.areaM2.trim() !== '');
      if (configuredPlanes.length === 0) return { result: null, error: null };

      const latitudeDegrees = parseNumber(siteLatitudeDegrees);
      const planes = configuredPlanes.map((plane, index) => ({
        id: plane.id,
        name: plane.name.trim() || `Água ${index + 1}`,
        areaM2: parseNumber(plane.areaM2),
        tiltDegrees: parseNumber(plane.tiltDegrees),
        azimuthDegrees: parseNumber(plane.azimuthDegrees),
        cardinalDirection: plane.cardinalDirection,
      }));

      return {
        result: calculateRoofOrientation({ latitudeDegrees, planes }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular a orientação do telhado.',
      };
    }
  }, [roofPlanes, siteLatitudeDegrees]);

  const roofOrientationResult = roofOrientationCalculation.result;

  useEffect(() => {
    if (!roofOrientationResult) return;
    setRoofAreaM2(String(roofOrientationResult.totalAreaM2));
  }, [roofOrientationResult]);

  const calculation = useMemo(() => {
    if (!consumptionResolution.monthlySeries) return { result: null, error: null };

    const hsp = parseNumber(hspDaily);
    const performanceRatio = parseNumber(performanceRatioPercent);
    const generationIncrease = parseNumber(generationIncreasePercent);
    if (!Number.isFinite(hsp) || !Number.isFinite(performanceRatio) || !Number.isFinite(generationIncrease)) {
      return { result: null, error: null };
    }

    try {
      return {
        result: calculateProfessionalSizing({
          monthlyConsumptionKwh: consumptionResolution.monthlySeries,
          connectionType,
          hspDaily: hsp,
          performanceRatioPercent: performanceRatio,
          roofOrientationFactor: roofOrientationResult?.weightedOrientationFactor ?? 1,
          generationIncreasePercent: generationIncrease,
          selectedKitPowerKwp: selectedKit?.kit_power_kwp ?? null,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular o dimensionamento.',
      };
    }
  }, [
    connectionType,
    consumptionResolution.monthlySeries,
    hspDaily,
    performanceRatioPercent,
    roofOrientationResult,
    generationIncreasePercent,
    selectedKit,
  ]);

  const updateConsumption = (index: number, value: string) => {
    setMonthlyConsumption((current) => current.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )));
  };

  const updateLoad = (id: string, field: keyof Omit<LoadSurveyDraft, 'id'>, value: string) => {
    setLoadSurvey((current) => current.map((load) => (
      load.id === id ? { ...load, [field]: value } : load
    )));
  };

  const addLoad = () => setLoadSurvey((current) => [...current, createLoadDraft()]);

  const removeLoad = (id: string) => {
    setLoadSurvey((current) => (
      current.length === 1 ? [createLoadDraft()] : current.filter((load) => load.id !== id)
    ));
  };

  const validateStep = () => {
    if (currentStep === 0) {
      const normalizedTitle = proposalTitle.trim().replace(/\s+/g, ' ');
      if (normalizedTitle.length < 3) {
        toast.error('Informe um nome para a proposta com pelo menos 3 caracteres.');
        return false;
      }
      if (normalizedTitle.length > 120) {
        toast.error('O nome da proposta deve ter no máximo 120 caracteres.');
        return false;
      }
      if (!selectedClient) {
        toast.error('Selecione um cliente cadastrado.');
        return false;
      }
    }

    if (currentStep === 1) {
      if (consumptionResolution.error || consumptionResolution.averageMonthlyConsumptionKwh == null) {
        toast.error(consumptionResolution.error || 'Informe o consumo mensal.');
        return false;
      }

      const availability = CONNECTION_AVAILABILITY_KWH[connectionType];
      if (consumptionResolution.averageMonthlyConsumptionKwh <= availability) {
        toast.error('O consumo médio deve ser maior que o custo de disponibilidade.');
        return false;
      }
    }

    if (currentStep === 2) {
      const parsedHsp = parseNumber(hspDaily);
      const parsedPerformanceRatio = parseNumber(performanceRatioPercent);
      const parsedGenerationIncrease = parseNumber(generationIncreasePercent);

      if (!Number.isFinite(parsedHsp) || parsedHsp <= 0) {
        toast.error('Informe uma HSP diária maior que zero.');
        return false;
      }
      if (!Number.isFinite(parsedPerformanceRatio) || parsedPerformanceRatio < 75 || parsedPerformanceRatio > 80) {
        toast.error('Informe um rendimento-base entre 75% e 80%.');
        return false;
      }
      if (!Number.isFinite(parsedGenerationIncrease) || parsedGenerationIncrease < 0 || parsedGenerationIncrease > 100) {
        toast.error('Informe uma geração adicional entre 0% e 100%.');
        return false;
      }
    }

    if (currentStep === 3) {
      const hasRoofTechnicalData = roofPlanes.some((plane) => plane.areaM2.trim() !== '');
      if (hasRoofTechnicalData && !roofOrientationResult) {
        toast.error(roofOrientationCalculation.error || 'Revise os dados técnicos informados para o telhado.');
        return false;
      }
    }

    if (currentStep === 5 && !paybackResult) {
      toast.error('Revise os dados financeiros para calcular o payback.');
      return false;
    }

    return true;
  };

  const buildDraftState = (step: number): ProposalDraftState => ({
    version: PROPOSAL_DRAFT_VERSION,
    currentStep: step,
    proposalTitle: proposalTitle.trim().replace(/\s+/g, ' '),
    selectedClientId,
    consumptionMode,
    directAverageConsumption,
    monthlyConsumption,
    loadSurvey,
    connectionType,
    gridVoltageV,
    electricalStandardId,
    hspDaily,
    performanceRatioPercent,
    generationIncreasePercent,
    modulePowerW,
    moduleWidthM,
    moduleHeightM,
    roofAreaM2,
    siteLatitudeDegrees,
    roofPlanes,
    roofPhotoReference,
    selectedKitId,
    paybackForm,
  });

  const buildDraftSummary = (): ProposalFlowSummary => {
    const source = consumptionMode === 'history'
      ? 'historical'
      : consumptionMode === 'loads'
        ? 'load_survey'
        : 'average';
    const margin = selectedKit ? paybackResult?.marginPercentage ?? null : null;
    const proposalPrice = paybackResult?.totalInvestment
      ?? (paybackForm
        ? parseOptionalNumber(paybackForm.proposalPrice || paybackForm.estimatedSystemCost || '')
        : null);
    const tariff = paybackForm ? parseOptionalNumber(paybackForm.tariffCentsPerKwh) : null;
    const billAmount = paybackForm?.averageMonthlyBillAmount
      ? parseOptionalNumber(paybackForm.averageMonthlyBillAmount)
      : null;

    return {
      title: proposalTitle.trim().replace(/\s+/g, ' ') || (selectedClient ? `Proposta em elaboração — ${selectedClient.name}` : undefined),
      consumption_source: source,
      history: consumptionMode === 'history' ? monthlyConsumption : null,
      monthly_consumption_kwh: consumptionResolution.averageMonthlyConsumptionKwh,
      estimated_daily_consumption: calculation.result?.targetDailyGenerationKwh ?? null,
      energy_tariff: tariff == null ? null : tariff / 100,
      bill_amount: billAmount,
      roof_area_m2: roofOrientationResult?.totalAreaM2 ?? parseOptionalNumber(roofAreaM2),
      roof_image_url: roofPhotoReference,
      roof_latitude_degrees: roofOrientationResult?.latitudeDegrees ?? parseOptionalNumber(siteLatitudeDegrees),
      roof_planes_json: roofOrientationResult?.planes.map(({ orientationFactor: _factor, orientationLossPercent: _loss, ...plane }) => plane) ?? [],
      roof_orientation_factor: roofOrientationResult?.weightedOrientationFactor ?? null,
      effective_performance_ratio: calculation.result?.performanceRatio ?? null,
      module_width_m: selectedKit?.module_width_m ?? parseOptionalNumber(moduleWidthM),
      module_height_m: selectedKit?.module_height_m ?? parseOptionalNumber(moduleHeightM),
      selected_solar_kit_id: selectedKit?.id ?? null,
      solar_kit_snapshot: selectedKit ? buildSolarKitSnapshot(selectedKit) : null,
      kit_cost: selectedKit?.cost_price ?? null,
      other_costs: selectedKit ? paybackResult?.additionalCostsTotal ?? null : null,
      margin_percentage: margin,
      total_cost: selectedKit ? paybackResult?.directCost ?? null : null,
      gross_price: proposalPrice,
      final_price: proposalPrice,
      estimated_profit: selectedKit ? paybackResult?.profitAmount ?? null : null,
    };
  };

  const persistDraftStep = async (nextStep: number) => {
    if (!user?.id || !selectedClient) {
      throw new Error('Selecione um cliente autenticado para salvar o rascunho.');
    }

    const flowState = buildDraftState(nextStep);
    const summary = buildDraftSummary();

    if (isEditMode && draftId) {
      await proposalService.saveCompletedProposal({
        proposalId: draftId,
        flowStep: nextStep,
        flowState,
        summary,
      });
      return false;
    }

    if (!draftId) {
      const outcome = await proposalService.createOrResumeFlowDraft({
        userId: user.id,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        flowStep: nextStep,
        flowState,
        summary,
      });

      setDraftId(outcome.proposal.id);
      navigate(getProposalContinuePath(outcome.proposal.id), { replace: true });

      if (outcome.resumed) {
        if (!isProposalDraftState(outcome.proposal.flow_state)) {
          throw new Error('O rascunho existente não possui dados compatíveis para retomada.');
        }
        hydrateProposalDraft(outcome.proposal.flow_state, outcome.proposal.title || '');
        toast.info('Já existia um rascunho para este cliente. O preenchimento foi retomado.');
        return true;
      }

      return false;
    }

    await proposalService.saveFlowDraft({
      proposalId: draftId,
      flowStep: nextStep,
      flowState,
      summary,
    });
    return false;
  };

  const goNext = async () => {
    if (!validateStep() || isSavingDraft) return;
    const nextStep = Math.min(currentStep + 1, STEPS.length - 1);

    try {
      setIsSavingDraft(true);
      const resumed = await persistDraftStep(nextStep);
      if (!resumed) setCurrentStep(nextStep);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const completeSizing = async () => {
    if (!validateStep() || isSavingDraft) return;
    if (!draftId) {
      toast.error('O rascunho ainda não foi criado.');
      return;
    }

    try {
      setIsSavingDraft(true);
      const flowState = buildDraftState(STEPS.length - 1);
      const saveInput = {
        proposalId: draftId,
        flowStep: STEPS.length - 1,
        flowState,
        summary: {
          ...buildDraftSummary(),
          title: proposalTitle.trim().replace(/\s+/g, ' '),
        },
      };

      const savedProposal = isEditMode
        ? await proposalService.saveCompletedProposal(saveInput)
        : await proposalService.completeFlowDraft(saveInput);
      const proposalWithRelations = await proposalService.getProposalById(savedProposal.id);
      setCompletedProposal(proposalWithRelations);
      setCurrentStep(STEPS.length - 1);
      toast.success(isEditMode ? 'Proposta atualizada. Agora escolha o modelo e envie.' : 'Proposta concluída. Agora gere e envie o PDF.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a proposta.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const result = calculation.result;
  const moduleSizing = useMemo<{ result: ModuleSizingResult | null; error: string | null }>(() => {
    if (!result || !selectedKit || !roofAreaM2.trim()) return { result: null, error: null };

    const parsedRoofArea = parseNumber(roofAreaM2);
    if (!Number.isFinite(parsedRoofArea) || parsedRoofArea <= 0) {
      return { result: null, error: 'A área do telhado deve ser maior que zero.' };
    }

    const kitModuleHeight = Number(selectedKit.module_height_m);
    const kitModuleWidth = Number(selectedKit.module_width_m);
    if (!Number.isFinite(kitModuleHeight) || kitModuleHeight <= 0 || !Number.isFinite(kitModuleWidth) || kitModuleWidth <= 0) {
      return { result: null, error: 'O kit selecionado não possui as dimensões A × L dos módulos. Edite o cadastro do kit.' };
    }

    try {
      return {
        result: calculateModuleSizing({
          requiredPowerKwp: result.requiredPowerKwp,
          modulePowerW: selectedKit.module_power_w,
          moduleQuantity: selectedKit.module_quantity,
          moduleWidthM: kitModuleWidth,
          moduleHeightM: kitModuleHeight,
          roofAreaM2: parsedRoofArea,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular a ocupação do telhado.',
      };
    }
  }, [result, roofAreaM2, selectedKit]);

  const hasCalculation = Boolean(result);

  if (isHydratingDraft) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-brand-blue" /> {isEditMode ? 'Carregando proposta...' : 'Carregando rascunho da proposta...'}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')} aria-label="Voltar para propostas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">{isEditMode ? 'Editar Proposta' : draftId ? 'Continuar Proposta' : 'Nova Proposta'}</h1>
            <p className="text-sm text-slate-500">
              Etapa {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${isSavingDraft ? 'bg-brand-yellow animate-pulse' : draftId ? 'bg-emerald-500' : hasCalculation ? 'bg-brand-blue animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs text-slate-500">
            {isSavingDraft
              ? 'Salvando rascunho...'
              : isEditMode
                ? 'Alterações salvas no registro finalizado'
                : draftId
                  ? 'Rascunho salvo automaticamente'
                  : hasCalculation
                    ? 'Cálculo atualizado automaticamente'
                    : 'Preencha os dados para calcular'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Etapas da proposta">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
              index < currentStep
                ? 'border-brand-blue bg-brand-blue text-white'
                : index === currentStep
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-brand-border text-slate-500'
            }`}>
              {index < currentStep ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
            </div>
            <span className={`ml-2 whitespace-nowrap text-sm transition-colors ${
              index <= currentStep ? 'font-medium text-brand-dark' : 'text-slate-500'
            }`}>
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-8 transition-colors sm:mx-4 sm:w-12 ${
                index < currentStep ? 'bg-brand-blue' : 'bg-gray-100'
              }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {calculation.error && (
              <div className="mb-6 flex items-start gap-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{calculation.error}</p>
              </div>
            )}

            {currentStep === 0 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Selecione o cliente</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    A proposta será vinculada a um cliente já cadastrado na sua conta.
                  </p>
                </div>

                <label className="block max-w-xl space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Nome da proposta *</span>
                  <Input
                    type="text"
                    value={proposalTitle}
                    maxLength={120}
                    placeholder="Ex.: Sistema fotovoltaico — Residência Silva"
                    onChange={(event) => setProposalTitle(event.target.value)}
                  />
                  <span className="flex justify-between gap-4 text-xs text-slate-500">
                    <span>Este nome identifica a proposta na listagem e pode ser alterado depois.</span>
                    <span className="shrink-0">{proposalTitle.length}/120</span>
                  </span>
                </label>

                {isLoadingClients ? (
                  <LoadingState label="Carregando clientes..." />
                ) : clientsError ? (
                  <ErrorState message={clientsError} />
                ) : clients.length === 0 ? (
                  <EmptyState
                    icon={<UserRound className="h-9 w-9 text-slate-400" />}
                    title="Nenhum cliente cadastrado"
                    description="Cadastre um cliente antes de iniciar o dimensionamento."
                    actionLabel="Cadastrar cliente"
                    onAction={() => navigate('/clientes/novo')}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="block flex-1 space-y-2">
                        <span className="text-sm font-semibold text-brand-dark">Cliente *</span>
                        <Select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} disabled={Boolean(draftId)}>
                          <option value="">Selecione um cliente cadastrado</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}{client.document ? ` — ${client.document}` : ''}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <Button type="button" variant="outline" onClick={() => navigate('/clientes/novo')}>
                        Novo cliente
                      </Button>
                    </div>

                    {selectedClient && (
                      <Card className="border-brand-blue/20 bg-brand-blue/5 shadow-none">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-blue text-white">
                              <UserRound className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Cliente selecionado</p>
                              <h3 className="mt-1 text-lg font-bold text-brand-dark">{selectedClient.name}</h3>
                              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <Detail label="Documento" value={selectedClient.document || 'Não informado'} />
                                <Detail label="Telefone" value={selectedClient.phone || 'Não informado'} />
                                <Detail label="E-mail" value={selectedClient.email || 'Não informado'} />
                                <Detail label="Localidade" value={[selectedClient.city, selectedClient.state].filter(Boolean).join(' - ') || 'Não informada'} />
                              </dl>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </section>
            )}

            {currentStep === 1 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Levantamento do consumo</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha como o consumo mensal será informado para o dimensionamento.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <ConsumptionModeButton
                    selected={consumptionMode === 'average'}
                    icon={<Gauge className="h-5 w-5" />}
                    title="Consumo médio direto"
                    description="Digite a média mensal já conhecida."
                    onClick={() => setConsumptionMode('average')}
                  />
                  <ConsumptionModeButton
                    selected={consumptionMode === 'history'}
                    icon={<CalendarDays className="h-5 w-5" />}
                    title="Histórico de 12 meses"
                    description="O sistema soma os meses e extrai a média."
                    onClick={() => setConsumptionMode('history')}
                  />
                  <ConsumptionModeButton
                    selected={consumptionMode === 'loads'}
                    icon={<ListChecks className="h-5 w-5" />}
                    title="Levantamento de cargas"
                    description="Estime pelo uso diário dos equipamentos."
                    onClick={() => setConsumptionMode('loads')}
                  />
                </div>

                {consumptionMode === 'average' && (
                  <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
                    <div className="max-w-md">
                      <Field
                        label="Consumo médio mensal"
                        value={directAverageConsumption}
                        onChange={(value) => {
                          setDirectAverageConsumption(value);
                          setCommittedDirectAverageConsumption('');
                        }}
                        onBlur={() => setCommittedDirectAverageConsumption(directAverageConsumption)}
                        type="text"
                        inputMode="decimal"
                        suffix="kWh/mês"
                        min={0.01}
                        helper="Aceita 1200, 1.200 ou 1.200,50. O cálculo é atualizado quando você sai do campo."
                      />
                      {selectedClient?.avg_consumption_kwh && selectedClient.avg_consumption_kwh > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          onClick={() => {
                            const clientAverage = String(selectedClient.avg_consumption_kwh);
                            setDirectAverageConsumption(clientAverage);
                            setCommittedDirectAverageConsumption(clientAverage);
                          }}
                        >
                          Usar média cadastrada do cliente: {number.format(selectedClient.avg_consumption_kwh)} kWh
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {consumptionMode === 'history' && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {MONTHS.map((month, index) => (
                      <label key={month} className="rounded-xl border border-brand-border bg-brand-gray/40 p-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{month}</span>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={monthlyConsumption[index]}
                            onChange={(event) => updateConsumption(index, event.target.value)}
                            className="pr-14"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">kWh</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {consumptionMode === 'loads' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4 text-sm text-slate-600">
                      Consumo mensal por equipamento = potência × quantidade × horas/dia × dias/semana ÷ 7 × 30 ÷ 1.000.
                    </div>

                    {loadSurvey.map((load, index) => {
                      let monthlyKwh = 0;
                      try {
                        monthlyKwh = calculateLoadMonthlyConsumptionKwh(toLoadInput(load));
                      } catch {
                        monthlyKwh = 0;
                      }

                      return (
                        <div key={load.id} className="rounded-xl border border-brand-border p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="font-semibold text-brand-dark">Equipamento {index + 1}</p>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLoad(load.id)} aria-label="Remover equipamento">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <Field type="text" label="Equipamento" value={load.equipmentName} onChange={(value) => updateLoad(load.id, 'equipmentName', value)} />
                            <Field label="Potência" value={load.powerWatts} onChange={(value) => updateLoad(load.id, 'powerWatts', value)} suffix="W" min={0.01} />
                            <Field label="Quantidade" value={load.quantity} onChange={(value) => updateLoad(load.id, 'quantity', value)} min={1} step="1" />
                            <Field label="Horas por dia" value={load.hoursPerDay} onChange={(value) => updateLoad(load.id, 'hoursPerDay', value)} suffix="h" min={0.01} max={24} />
                            <Field label="Dias por semana" value={load.daysPerWeek} onChange={(value) => updateLoad(load.id, 'daysPerWeek', value)} min={1} max={7} step="1" />
                          </div>
                          <p className="mt-4 text-right text-sm text-slate-500">
                            Estimativa: <strong className="text-brand-dark">{number.format(monthlyKwh)} kWh/mês</strong>
                          </p>
                        </div>
                      );
                    })}

                    <Button type="button" variant="outline" className="gap-2" onClick={addLoad}>
                      <Plus className="h-4 w-4" /> Adicionar equipamento
                    </Button>
                  </div>
                )}

                <label className="block max-w-xl space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Padrão elétrico da unidade</span>
                  <Select
                    value={electricalStandardId}
                    onChange={(event) => setElectricalStandardId(event.target.value as ElectricalStandardId)}
                  >
                    {ELECTRICAL_STANDARD_OPTIONS.map((standard) => (
                      <option key={standard.id} value={standard.id}>{standard.label}</option>
                    ))}
                  </Select>
                  <p className="text-xs leading-5 text-slate-500">
                    O tipo de ligação define o custo de disponibilidade de {CONNECTION_AVAILABILITY_KWH[connectionType]} kWh. As tensões do padrão são usadas somente para conferir a compatibilidade do inversor.
                  </p>
                </label>

                {consumptionPreview && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary label="Consumo anual" value={`${number.format(consumptionPreview.annualConsumptionKwh)} kWh`} />
                    <Summary label="Média mensal" value={`${number.format(consumptionPreview.averageMonthlyConsumptionKwh)} kWh`} />
                    <Summary label="Disponibilidade" value={`${consumptionPreview.availabilityConsumptionKwh} kWh`} />
                    <Summary label="Consumo compensável" value={`${number.format(consumptionPreview.compensableMonthlyConsumptionKwh)} kWh/mês`} />
                  </div>
                )}
              </section>
            )}

            {currentStep === 2 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">HSP, perdas e meta de geração</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Informe a HSP, o rendimento-base do sistema e quanto o cliente deseja gerar além do consumo compensável. A orientação do telhado será aplicada na próxima etapa.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="HSP média diária"
                    value={hspDaily}
                    onChange={setHspDaily}
                    suffix="h/dia"
                    min={0.1}
                    step="0.01"
                    helper="Use a HSP média diária obtida para a região do cliente."
                  />
                  <Field
                    label="Rendimento-base do sistema"
                    value={performanceRatioPercent}
                    onChange={setPerformanceRatioPercent}
                    suffix="%"
                    min={75}
                    max={80}
                    step="0.5"
                    helper="Perdas elétricas, térmicas e operacionais. A inclinação e o azimute serão aplicados separadamente."
                  />
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
                  <div className="max-w-md">
                    <Field
                      label="Geração adicional desejada"
                      value={generationIncreasePercent}
                      onChange={setGenerationIncreasePercent}
                      suffix="%"
                      min={0}
                      max={100}
                      step="1"
                      helper="O percentual é aplicado sobre o consumo compensável. Use 0% quando o cliente não solicitar geração adicional."
                    />
                  </div>
                </div>

                {result && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary label="Consumo compensável" value={`${number.format(result.compensableMonthlyConsumptionKwh)} kWh/mês`} />
                    <Summary label="Geração adicional" value={`${number.format(result.generationIncreasePercent)}%`} />
                    <Summary label="Meta de geração" value={`${number.format(result.targetMonthlyGenerationKwh)} kWh/mês`} />
                    <Summary label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} highlight />
                  </div>
                )}
              </section>
            )}

            {currentStep === 3 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Dados do telhado — opcional</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Preencha somente quando já houver levantamento do local. A ausência destas informações não impede a pré-proposta; inclinação, orientação, área, sombreamento e estrutura serão confirmados na vistoria técnica.
                  </p>
                </div>

                <RoofPlanesEditor
                  latitudeDegrees={siteLatitudeDegrees}
                  onLatitudeChange={setSiteLatitudeDegrees}
                  planes={roofPlanes}
                  onPlanesChange={setRoofPlanes}
                  orientationResult={roofOrientationResult}
                  basePerformanceRatioPercent={parseOptionalNumber(performanceRatioPercent)}
                />

                {roofOrientationCalculation.error && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm text-amber-200">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{roofOrientationCalculation.error}</p>
                  </div>
                )}

                <RoofPhotoUpload
                  clientId={selectedClient?.id ?? null}
                  initialStorageReference={roofPhotoReference}
                  onReferenceChange={setRoofPhotoReference}
                />
              </section>
            )}

            {currentStep === 4 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Kit solar de referência — opcional</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Selecione um kit apenas quando ele já estiver definido. Sem kit, a pré-proposta usa a potência necessária calculada e o preço informado diretamente na próxima etapa.
                  </p>
                </div>

                {isLoadingKits ? (
                  <LoadingState label="Carregando kits..." />
                ) : kitsError ? (
                  <ErrorState message={kitsError} />
                ) : kits.length === 0 ? (
                  <EmptyState
                    icon={<PackageCheck className="h-9 w-9 text-slate-400" />}
                    title="Nenhum kit on-grid ativo"
                    description="O cadastro de kit é opcional para a pré-proposta. Você pode continuar e informar diretamente o preço da proposta na próxima etapa."
                    actionLabel="Abrir catálogo de kits"
                    onAction={() => navigate('/kits-solares')}
                  />
                ) : (
                  <label className="block space-y-2 rounded-xl border border-brand-light/30 bg-brand-gray/70 p-4">
                    <span className="text-sm font-semibold text-brand-dark">Kit solar de referência (opcional)</span>
                    <Select
                      className="border-brand-light/50 bg-brand-gray text-brand-dark shadow-inner focus-visible:ring-brand-light"
                      value={selectedKitId}
                      onChange={(event) => {
                        setSelectedKitId(event.target.value);
                        setPaybackResult(null);
                      }}
                    >
                      <option value="">Selecione um kit cadastrado</option>
                      {kits.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          {kit.name} — {number.format(kit.kit_power_kwp)} kWp{kit.grid_connection_type ? ` — ${SOLAR_KIT_CONNECTION_TYPE_LABELS[kit.grid_connection_type]}` : ''}{kit.grid_voltage_v ? ` ${kit.grid_voltage_v} V` : ''}{!kit.module_height_m || !kit.module_width_m ? ' — dimensões pendentes' : ''}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}

                {!selectedKit && (
                  <div className="flex items-start gap-3 rounded-xl border border-brand-light/30 bg-brand-blue/10 p-4 text-sm leading-6 text-slate-200">
                    <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                    <p><strong>Equipamentos a definir.</strong> A pré-proposta continuará com a potência preliminar calculada. Módulos, inversor, fabricante e fornecedor serão confirmados após a vistoria técnica.</p>
                  </div>
                )}

                {selectedKit && result && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border-brand-light/30 bg-brand-gray/70 shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-light">Kit selecionado</p>
                          <h3 className="mt-2 text-lg font-bold text-brand-dark">{selectedKit.name}</h3>
                          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <Detail label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                            <Detail label="Módulos" value={`${selectedKit.module_quantity} × ${number.format(selectedKit.module_power_w)} W`} />
                            <Detail label="Dimensões A × L" value={selectedKit.module_height_m && selectedKit.module_width_m ? `${number.format(selectedKit.module_height_m)} × ${number.format(selectedKit.module_width_m)} m` : 'Não informadas'} />
                            <Detail label="Módulo" value={[selectedKit.module_brand, selectedKit.module_model].filter(Boolean).join(' ') || 'Não informado'} />
                            <Detail label="Inversor" value={[selectedKit.inverter_brand, selectedKit.inverter_model].filter(Boolean).join(' ') || 'Não informado'} />
                            <Detail label="Potência AC do inversor" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />
                            <Detail label="Ligação atendida pelo kit" value={selectedKit.grid_connection_type ? SOLAR_KIT_CONNECTION_TYPE_LABELS[selectedKit.grid_connection_type] : 'Não informada'} />
                            <Detail label="Tensão nominal do kit" value={selectedKit.grid_voltage_v ? `${number.format(selectedKit.grid_voltage_v)} V` : 'Não informada'} />
                          </dl>
                        </CardContent>
                      </Card>

                      <Card className={`shadow-none ${result.selectedKitIsAdequate ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-amber-400/50 bg-amber-500/10'}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            {result.selectedKitIsAdequate ? (
                              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />
                            )}
                            <div>
                              <p className="font-bold text-brand-dark">
                                {result.selectedKitIsAdequate ? 'Kit atende à potência calculada' : 'Kit abaixo da potência calculada'}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-200">
                                Necessário: {number.format(result.requiredPowerKwp)} kWp. Selecionado: {number.format(selectedKit.kit_power_kwp)} kWp.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedKitElectricalCompatibility && (
                      <div className={`rounded-xl border p-5 ${
                        selectedKitElectricalCompatibility.status === 'compatible'
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : selectedKitElectricalCompatibility.status === 'connection_upgrade_required'
                            ? 'border-amber-400/50 bg-amber-500/10'
                            : selectedKitElectricalCompatibility.status === 'technical_review'
                              ? 'border-brand-light/40 bg-brand-blue/10'
                              : 'border-slate-400/40 bg-slate-500/10'
                      }`}>
                        <div className="flex items-start gap-3">
                          {selectedKitElectricalCompatibility.status === 'compatible' ? (
                            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
                          ) : selectedKitElectricalCompatibility.status === 'technical_review' ? (
                            <Gauge className="mt-0.5 h-6 w-6 shrink-0 text-brand-light" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />
                          )}
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-light">Compatibilidade elétrica</p>
                            <h3 className="mt-1 text-lg font-bold text-brand-dark">{selectedKitElectricalCompatibility.statusLabel}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-200">{selectedKitElectricalCompatibility.guidance}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {moduleSizing.error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {moduleSizing.error}
                      </div>
                    )}

                    {moduleSizing.result && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <Summary label="Quantidade de módulos do kit" value={`${moduleSizing.result.moduleQuantity} módulos`} />
                          <Summary label="Área por módulo" value={`${number.format(moduleSizing.result.moduleAreaM2)} m²`} />
                          <Summary label="Área total dos módulos" value={`${number.format(moduleSizing.result.totalModuleAreaM2)} m²`} />
                          <Summary label="Área útil do telhado" value={`${number.format(moduleSizing.result.roofAreaM2)} m²`} highlight />
                        </div>

                        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                          moduleSizing.result.modulesFitRoof
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}>
                          {moduleSizing.result.modulesFitRoof ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                          )}
                          <div>
                            <p className="font-bold">
                              {moduleSizing.result.modulesFitRoof
                                ? 'Os módulos do kit cabem na área útil do telhado'
                                : 'Os módulos do kit não cabem na área útil do telhado'}
                            </p>
                            <p className="mt-1 text-xs leading-5 opacity-80">
                              Saldo estimado: {number.format(moduleSizing.result.availableAreaBalanceM2)} m². Recuos, obstáculos, orientação e espaçamento devem ser verificados no projeto executivo.
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} />
                      <Summary label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                      <Summary label="Geração mensal estimada" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh`} />
                      <Summary label="Cobertura da meta" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} highlight />
                    </div>

                    <div className="rounded-xl border border-brand-light/20 bg-brand-gray/70 p-4 text-sm text-slate-200">
                      <div className="flex items-start gap-3">
                        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                        <p>
                          Meta de geração: <strong>{number.format(result.targetMonthlyGenerationKwh)} kWh/mês</strong>, com <strong>{number.format(result.generationIncreasePercent)}%</strong> adicional.
                          HSP adotada: <strong>{hspDaily} h/dia</strong>, rendimento-base de <strong>{performanceRatioPercent}%</strong>, fator solar do telhado de <strong>{number.format(result.roofOrientationFactor * 100)}%</strong> e rendimento global efetivo de <strong>{number.format(result.effectivePerformanceRatioPercent)}%</strong>.
                          O saldo mensal estimado do kit em relação à meta é de <strong>{number.format(result.selectedKitEnergyBalanceKwh ?? 0)} kWh</strong>.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {currentStep === 5 && (
              result ? (
                <PaybackStep
                  selectedKit={selectedKit}
                  connectionType={connectionType}
                  monthlyCompensableConsumptionKwh={result.compensableMonthlyConsumptionKwh}
                  monthlyGenerationKwh={result.selectedKitEstimatedMonthlyGenerationKwh ?? result.targetMonthlyGenerationKwh}
                  initialForm={paybackForm}
                  onDraftChange={setPaybackForm}
                  onResultChange={setPaybackResult}
                />
              ) : (
                <ErrorState message="Informe consumo, HSP e rendimento-base antes de calcular o investimento e o payback." />
              )
            )}

            {currentStep === 6 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Resultado do dimensionamento</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Revise os dados comerciais e as premissas preliminares antes de concluir. As condições técnicas serão confirmadas em vistoria.
                  </p>
                </div>

                {result && paybackResult ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label={selectedKit ? 'Kit de referência' : 'Equipamentos'} value={selectedKit?.name ?? 'A definir após vistoria'} />
                      <Summary label={selectedKit ? 'Potência do kit' : 'Potência preliminar'} value={`${number.format(selectedKit?.kit_power_kwp ?? result.requiredPowerKwp)} kWp`} />
                      <Summary label="Preço da proposta" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />
                      <Summary label="Payback" value={`${number.format(paybackResult.paybackYears)} anos`} highlight />
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-5 text-amber-700">
                      <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                      <div>
                        <p className="font-bold">Pré-proposta sujeita à vistoria técnica</p>
                        <p className="mt-1 text-sm leading-6">Kit, quantidade e modelo dos equipamentos, potência final, área disponível, inclinação, orientação, sombreamento, estrutura e geração poderão ser ajustados após a inspeção do local.</p>
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 rounded-xl border p-5 ${
                      paybackResult.status === 'unfeasible'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {paybackResult.status === 'unfeasible' ? (
                        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-75">Status financeiro</p>
                        <h3 className="mt-1 text-lg font-bold">Payback {paybackResult.statusLabel}</h3>
                        <p className="mt-1 text-sm leading-6">
                          Economia mensal estimada de <strong>R$ {number.format(paybackResult.monthlySavings)}</strong> e anual de <strong>R$ {number.format(paybackResult.annualSavings)}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Resultado técnico</p>
                          <dl className="mt-4 space-y-3 text-sm">
                            <PreviewRow label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} />
                            <PreviewRow label="Geração estimada" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? result.targetMonthlyGenerationKwh)} kWh/mês`} />
                            <PreviewRow label="Fator solar do telhado" value={roofOrientationResult ? `${number.format(result.roofOrientationFactor * 100)}%` : 'Não verificado — premissa neutra'} />
                            <PreviewRow label="Rendimento global efetivo" value={`${number.format(result.effectivePerformanceRatioPercent)}%`} />
                            {selectedKit && <PreviewRow label="Cobertura da meta" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} />}
                          </dl>
                        </CardContent>
                      </Card>

                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Resultado financeiro</p>
                          <dl className="mt-4 space-y-3 text-sm">
                            <PreviewRow label="Preço da proposta" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />
                            {selectedKit ? (
                              <>
                                <PreviewRow label="Custo direto estimado" value={`R$ ${number.format(paybackResult.directCost)}`} />
                                <PreviewRow label="Lucro estimado" value={`R$ ${number.format(paybackResult.profitAmount)}`} />
                                <PreviewRow label="Margem efetiva" value={`${number.format(paybackResult.marginPercentage)}%`} />
                              </>
                            ) : (
                              <PreviewRow label="Rentabilidade interna" value="Não calculada — kit não definido" />
                            )}
                  {paybackResult.averageMonthlyBillAmount != null && (
                    <>
                      <PreviewRow label="Fatura média atual" value={`R$ ${number.format(paybackResult.averageMonthlyBillAmount)}`} />
                      <PreviewRow label="Fatura residual estimada" value={`R$ ${number.format(paybackResult.estimatedResidualBillAmount ?? 0)}`} />
                      <PreviewRow label="Redução estimada da fatura" value={`${number.format(paybackResult.estimatedBillReductionPercent ?? 0)}%`} />
                    </>
                  )}
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <ErrorState message="Preencha as etapas anteriores para gerar o resultado final." />
                )}
              </section>
            )}

            {currentStep === STEPS.length - 1 && (
              completedProposal ? (
                <ProposalDeliveryPanel proposal={completedProposal} onProposalChange={setCompletedProposal} />
              ) : (
                <ErrorState message="Conclua e salve a proposta antes de gerar o PDF e o link público." />
              )
            )}

            <div className="mt-8 flex justify-between border-t border-brand-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                disabled={currentStep === 0 || isSavingDraft}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>

              {currentStep < STEPS.length - 2 ? (
                <Button type="button" onClick={() => void goNext()} className="gap-2" disabled={isSavingDraft}>
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : currentStep === STEPS.length - 2 ? (
                <Button type="button" onClick={() => void completeSizing()} className="gap-2" disabled={isSavingDraft}>
                  {isEditMode ? 'Salvar e preparar envio' : 'Concluir e preparar envio'} <CheckCircle2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => navigate(`/propostas/${draftId}`)} className="gap-2">
                  Ver detalhes da proposta <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-1 lg:sticky lg:top-6">
          <SizingPreview
            selectedClient={selectedClient}
            consumptionPreview={consumptionPreview}
            result={result}
            selectedKit={selectedKit}
            hspDaily={hspDaily}
            generationIncreasePercent={generationIncreasePercent}
            moduleSizing={moduleSizing.result}
            roofOrientationResult={roofOrientationResult}
          />
        </div>
      </div>
    </div>
  );
}

function ConsumptionModeButton({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/20'
          : 'border-brand-border bg-brand-surface hover:border-brand-blue/30 hover:bg-brand-gray/30'
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? 'bg-brand-blue text-white' : 'bg-brand-gray text-slate-500'}`}>
        {icon}
      </span>
      <p className="mt-3 font-bold text-brand-dark">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function SizingPreview({
  selectedClient,
  consumptionPreview,
  result,
  selectedKit,
  hspDaily,
  generationIncreasePercent,
  moduleSizing,
  roofOrientationResult,
}: {
  selectedClient: Client | null;
  consumptionPreview: {
    sourceLabel: string;
    annualConsumptionKwh: number;
    averageMonthlyConsumptionKwh: number;
    availabilityConsumptionKwh: number;
    compensableMonthlyConsumptionKwh: number;
  } | null;
  result: ProfessionalSizingResult | null;
  selectedKit: SolarKit | null;
  hspDaily: string;
  generationIncreasePercent: string;
  moduleSizing: ModuleSizingResult | null;
  roofOrientationResult: RoofOrientationResult | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <Gauge className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">Resumo do dimensionamento</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Prévia atualizada conforme o preenchimento.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedClient ? (
          <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Cliente</p>
            <p className="mt-1 font-bold text-brand-dark">{selectedClient.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[selectedClient.city, selectedClient.state].filter(Boolean).join(' - ') || selectedClient.document || 'Cadastro selecionado'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-border p-5 text-center text-sm text-slate-500">
            Selecione o cliente para iniciar a proposta.
          </div>
        )}

        {selectedClient && !consumptionPreview && (
          <div className="rounded-lg border border-dashed border-brand-border p-5 text-center text-sm text-slate-500">
            Informe o consumo por média direta, histórico de 12 meses ou levantamento de cargas.
          </div>
        )}

        {consumptionPreview && (
          <dl className="space-y-3 border-t border-brand-border pt-4 text-sm">
            <PreviewRow label="Origem do consumo" value={consumptionPreview.sourceLabel} />
            <PreviewRow label="Média mensal" value={`${number.format(consumptionPreview.averageMonthlyConsumptionKwh)} kWh`} />
            <PreviewRow label="Disponibilidade" value={`${consumptionPreview.availabilityConsumptionKwh} kWh`} />
            <PreviewRow label="Consumo compensável" value={`${number.format(consumptionPreview.compensableMonthlyConsumptionKwh)} kWh`} />
            <PreviewRow label="Geração adicional" value={Number.isFinite(parseNumber(generationIncreasePercent)) ? `${number.format(parseNumber(generationIncreasePercent))}%` : '0%'} />
            <PreviewRow label="Meta de geração" value={result ? `${number.format(result.targetMonthlyGenerationKwh)} kWh/mês` : 'Aguardando HSP'} />
            <PreviewRow label="HSP" value={Number.isFinite(parseNumber(hspDaily)) ? `${number.format(parseNumber(hspDaily))} h/dia` : 'Não informada'} />
            {roofOrientationResult && (
              <>
                <PreviewRow label="Águas cadastradas" value={`${roofOrientationResult.planes.length}`} />
                <PreviewRow label="Fator solar do telhado" value={`${number.format(roofOrientationResult.weightedOrientationFactor * 100)}%`} />
                <PreviewRow label="Rendimento global efetivo" value={result ? `${number.format(result.effectivePerformanceRatioPercent)}%` : 'Aguardando cálculo'} />
              </>
            )}
            <PreviewRow
              label="Energia de geração"
              value={result
                ? `${result.targetDailyGenerationKwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh/dia`
                : 'Aguardando HSP'}
            />
            <PreviewRow label="Potência necessária" value={result ? `${number.format(result.requiredPowerKwp)} kWp` : 'Aguardando HSP'} highlight />
            {selectedKit && <PreviewRow label="Quantidade de módulos do kit" value={`${selectedKit.module_quantity} módulos`} />}
            {moduleSizing && (
              <>
                <PreviewRow label="Área dos módulos" value={`${number.format(moduleSizing.totalModuleAreaM2)} m²`} />
                <PreviewRow label="Área útil do telhado" value={`${number.format(moduleSizing.roofAreaM2)} m²`} />
                <PreviewRow label="Status do telhado" value={moduleSizing.modulesFitRoof ? 'Cabe' : 'Não cabe'} highlight />
              </>
            )}
          </dl>
        )}

        {selectedKit && result && (
          <div className="space-y-3 border-t border-brand-border pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kit selecionado</p>
              <p className="mt-1 font-bold text-brand-dark">{selectedKit.name}</p>
              <p className="mt-1 text-sm text-slate-500">{number.format(selectedKit.kit_power_kwp)} kWp</p>
            </div>
            <PreviewRow label="Geração estimada" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh/mês`} />
            <PreviewRow label="Cobertura" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} />
            <div className={`rounded-lg border p-3 text-sm font-semibold ${
              result.selectedKitIsAdequate
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                : 'border-amber-400/50 bg-amber-500/10 text-amber-100'
            }`}>
              {result.selectedKitIsAdequate ? 'Kit compatível com a potência calculada.' : 'Kit abaixo da potência calculada.'}
            </div>
          </div>
        )}

        <p className="border-t border-brand-border pt-4 text-xs leading-5 text-slate-500">
          Esta é uma pré-proposta. Equipamentos e condições do telhado podem permanecer a definir e devem ser confirmados na vistoria técnica.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border p-8 text-center">
      <div className="mx-auto w-fit">{icon}</div>
      <h3 className="mt-3 font-bold text-brand-dark">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Button type="button" className="mt-4" onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}

function PreviewRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${highlight ? 'font-bold text-brand-blue' : 'font-semibold text-brand-dark'}`}>{value}</dd>
    </div>
  );
}

function Summary({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-brand-blue/30 bg-brand-blue/10' : 'border-brand-border bg-brand-gray/40'}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-brand-dark">{value}</dd>
    </div>
  );
}
