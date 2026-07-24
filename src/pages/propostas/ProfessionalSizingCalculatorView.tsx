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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { technicalNumber as number } from '../../lib/formatters/technicalNumber';
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
import {
  calculateModuleQuantity,
  calculateModuleSizing,
  type ModuleSizingResult,
} from '../../lib/calculations/moduleSizing';
import { clientService } from '../../services/clientService';
import { solarKitService } from '../../services/solarKitService';
import type { Client } from '../../types/client';
import type { SolarKit } from '../../types/solarKit';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'modules', title: 'Quantidade de módulos e área do telhado' },
  { id: 'kit', title: 'Kit e resultado' },
] as const;

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return Number.NaN;
  return Number(normalized);
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
          onChange={(event) => onChange(event.target.value)}
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
  const [searchParams] = useSearchParams();
  const clientIdFromQuery = searchParams.get('clienteId') || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromQuery);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [consumptionMode, setConsumptionMode] = useState<ConsumptionMode>('history');
  const [directAverageConsumption, setDirectAverageConsumption] = useState('');
  const [monthlyConsumption, setMonthlyConsumption] = useState<string[]>(
    () => Array.from({ length: 12 }, () => ''),
  );
  const [loadSurvey, setLoadSurvey] = useState<LoadSurveyDraft[]>([createLoadDraft()]);
  const [connectionType, setConnectionType] = useState<ConnectionType>('monophase');

  const [hspDaily, setHspDaily] = useState('');
  const [performanceRatioPercent, setPerformanceRatioPercent] = useState('80');
  const [generationIncreasePercent, setGenerationIncreasePercent] = useState('0');

  const [modulePowerW, setModulePowerW] = useState('275');
  const [moduleWidthM, setModuleWidthM] = useState('');
  const [moduleHeightM, setModuleHeightM] = useState('');
  const [roofAreaM2, setRoofAreaM2] = useState('');

  const [kits, setKits] = useState<SolarKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);

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

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const selectedKit = useMemo(
    () => kits.find((kit) => kit.id === selectedKitId) ?? null,
    [kits, selectedKitId],
  );

  const consumptionModeInput = useMemo(() => ({
    mode: consumptionMode,
    directAverageMonthlyKwh: parseNumber(directAverageConsumption),
    monthlyHistoryKwh: monthlyConsumption.map(parseNumber),
    loads: loadSurvey.map(toLoadInput),
  }), [consumptionMode, directAverageConsumption, loadSurvey, monthlyConsumption]);

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
    if (currentStep === 0 && !selectedClient) {
      toast.error('Selecione um cliente cadastrado.');
      return false;
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
        toast.error('Informe um rendimento global entre 75% e 80%.');
        return false;
      }
      if (!Number.isFinite(parsedGenerationIncrease) || parsedGenerationIncrease < 0 || parsedGenerationIncrease > 100) {
        toast.error('Informe uma geração adicional entre 0% e 100%.');
        return false;
      }
    }

    if (currentStep === 3) {
      const moduleFields = [
        { value: parseNumber(modulePowerW), message: 'Informe a potência do módulo em Wp.' },
        { value: parseNumber(moduleWidthM), message: 'Informe a largura do módulo em metros.' },
        { value: parseNumber(moduleHeightM), message: 'Informe a altura do módulo em metros.' },
        { value: parseNumber(roofAreaM2), message: 'Informe a área do telhado em metros quadrados.' },
      ];
      const invalidModuleField = moduleFields.find((field) => !Number.isFinite(field.value) || field.value <= 0);
      if (invalidModuleField) {
        toast.error(invalidModuleField.message);
        return false;
      }
    }

    if (currentStep === 4 && !selectedKit) {
      toast.error('Selecione um kit on-grid cadastrado.');
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const completeSizing = () => {
    if (!validateStep()) return;
    toast.success('Dimensionamento concluído.');
  };

  const result = calculation.result;
  const moduleQuantity = useMemo(() => {
    const parsedModulePower = parseNumber(modulePowerW);
    if (!result || !Number.isFinite(parsedModulePower) || parsedModulePower <= 0) return null;

    try {
      return calculateModuleQuantity(result.requiredPowerKwp, parsedModulePower);
    } catch {
      return null;
    }
  }, [modulePowerW, result]);

  const moduleSizing = useMemo<{ result: ModuleSizingResult | null; error: string | null }>(() => {
    if (!result) return { result: null, error: null };

    const values = {
      modulePowerW: parseNumber(modulePowerW),
      moduleWidthM: parseNumber(moduleWidthM),
      moduleHeightM: parseNumber(moduleHeightM),
      roofAreaM2: parseNumber(roofAreaM2),
    };

    if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) {
      return { result: null, error: null };
    }

    try {
      return {
        result: calculateModuleSizing({
          requiredPowerKwp: result.requiredPowerKwp,
          ...values,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular a ocupação do telhado.',
      };
    }
  }, [moduleHeightM, modulePowerW, moduleWidthM, result, roofAreaM2]);

  const hasCalculation = Boolean(result);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/propostas')} aria-label="Voltar para propostas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Nova Proposta</h1>
            <p className="text-sm text-slate-500">
              Etapa {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${hasCalculation ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs text-slate-500">
            {hasCalculation ? 'Cálculo atualizado automaticamente' : 'Preencha os dados para calcular'}
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
                        <Select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
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
                        onChange={setDirectAverageConsumption}
                        suffix="kWh/mês"
                        min={0.01}
                        helper="Use a média já calculada a partir da conta de energia ou de outro estudo confiável."
                      />
                      {selectedClient?.avg_consumption_kwh && selectedClient.avg_consumption_kwh > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          onClick={() => setDirectAverageConsumption(String(selectedClient.avg_consumption_kwh))}
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

                <label className="block max-w-md space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Tipo de ligação</span>
                  <Select value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}>
                    <option value="monophase">Monofásica — 30 kWh</option>
                    <option value="biphase">Bifásica — 50 kWh</option>
                    <option value="triphase">Trifásica — 100 kWh</option>
                  </Select>
                  <p className="text-xs leading-5 text-slate-500">
                    O sistema subtrai automaticamente o custo de disponibilidade da média mensal obtida no modo escolhido.
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
                  <h2 className="text-lg font-bold text-brand-dark">HSP, rendimento e meta de geração</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Informe a HSP, o rendimento global e quanto o cliente deseja gerar além do consumo compensável.
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
                    label="Rendimento global"
                    value={performanceRatioPercent}
                    onChange={setPerformanceRatioPercent}
                    suffix="%"
                    min={75}
                    max={80}
                    step="0.5"
                    helper="Faixa adotada neste fluxo: 75% a 80%."
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
                  <h2 className="text-lg font-bold text-brand-dark">Quantidade de módulos e área do telhado</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Informe a potência e as dimensões do módulo, além da área útil disponível no telhado.
                  </p>
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field
                      label="Potência do módulo"
                      value={modulePowerW}
                      onChange={setModulePowerW}
                      suffix="Wp"
                      min={1}
                      step="1"
                    />
                    <Field label="Largura do módulo" value={moduleWidthM} onChange={setModuleWidthM} suffix="m" min={0.01} step="0.001" />
                    <Field label="Altura do módulo" value={moduleHeightM} onChange={setModuleHeightM} suffix="m" min={0.01} step="0.001" />
                    <Field label="Área do telhado" value={roofAreaM2} onChange={setRoofAreaM2} suffix="m²" min={0.01} step="0.01" />
                  </div>

                  {result && moduleQuantity != null && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Quantidade de módulos" value={`${moduleQuantity} módulos`} highlight />
                      <Summary label="Potência instalada" value={`${number.format((moduleQuantity * parseNumber(modulePowerW)) / 1000)} kWp`} />
                      {moduleSizing.result && (
                        <>
                          <Summary label="Área por módulo" value={`${number.format(moduleSizing.result.moduleAreaM2)} m²`} />
                          <Summary label="Área total dos módulos" value={`${number.format(moduleSizing.result.totalModuleAreaM2)} m²`} />
                          <Summary label="Área útil do telhado" value={`${number.format(moduleSizing.result.roofAreaM2)} m²`} />
                          <Summary label="Saldo de área" value={`${number.format(moduleSizing.result.availableAreaBalanceM2)} m²`} />
                        </>
                      )}
                    </div>
                  )}

                  {moduleSizing.error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {moduleSizing.error}
                    </div>
                  )}

                  {moduleSizing.result && (
                    <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
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
                            ? 'Os módulos cabem na área útil do telhado'
                            : 'Os módulos não cabem na área útil do telhado'}
                        </p>
                        <p className="mt-1 text-xs leading-5 opacity-80">
                          Estimativa por área. Recuos, obstáculos, orientação e espaçamento devem ser verificados no projeto executivo.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {currentStep === 4 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha um kit on-grid ativo. Os módulos e o inversor já pertencem ao cadastro do kit.
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
                    description="Cadastre ou ative um kit antes de concluir o dimensionamento."
                    actionLabel="Abrir catálogo de kits"
                    onAction={() => navigate('/kits-solares')}
                  />
                ) : (
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-brand-dark">Kit solar</span>
                    <Select value={selectedKitId} onChange={(event) => setSelectedKitId(event.target.value)}>
                      <option value="">Selecione um kit cadastrado</option>
                      {kits.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          {kit.name} — {number.format(kit.kit_power_kwp)} kWp
                        </option>
                      ))}
                    </Select>
                  </label>
                )}

                {selectedKit && result && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Kit selecionado</p>
                          <h3 className="mt-2 text-lg font-bold text-brand-dark">{selectedKit.name}</h3>
                          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <Detail label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                            <Detail label="Módulos" value={`${selectedKit.module_quantity} × ${number.format(selectedKit.module_power_w)} W`} />
                            <Detail label="Módulo" value={[selectedKit.module_brand, selectedKit.module_model].filter(Boolean).join(' ') || 'Não informado'} />
                            <Detail label="Inversor" value={[selectedKit.inverter_brand, selectedKit.inverter_model].filter(Boolean).join(' ') || 'Não informado'} />
                          </dl>
                        </CardContent>
                      </Card>

                      <Card className={`shadow-none ${result.selectedKitIsAdequate ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            {result.selectedKitIsAdequate ? (
                              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
                            )}
                            <div>
                              <p className="font-bold text-brand-dark">
                                {result.selectedKitIsAdequate ? 'Kit atende à potência calculada' : 'Kit abaixo da potência calculada'}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Necessário: {number.format(result.requiredPowerKwp)} kWp. Selecionado: {number.format(selectedKit.kit_power_kwp)} kWp.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} />
                      <Summary label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                      <Summary label="Geração mensal estimada" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh`} />
                      <Summary label="Cobertura da meta" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} highlight />
                    </div>

                    <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                        <p>
                          Meta de geração: <strong>{number.format(result.targetMonthlyGenerationKwh)} kWh/mês</strong>, com <strong>{number.format(result.generationIncreasePercent)}%</strong> adicional.
                          HSP adotada: <strong>{hspDaily} h/dia</strong> e rendimento global de <strong>{performanceRatioPercent}%</strong>.
                          O saldo mensal estimado do kit em relação à meta é de <strong>{number.format(result.selectedKitEnergyBalanceKwh ?? 0)} kWh</strong>.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            <div className="mt-8 flex justify-between border-t border-brand-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext} className="gap-2">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={completeSizing} className="gap-2">
                  Concluir dimensionamento <CheckCircle2 className="h-4 w-4" />
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
            moduleQuantity={moduleQuantity}
            moduleSizing={moduleSizing.result}
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
  moduleQuantity,
  moduleSizing,
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
  moduleQuantity: number | null;
  moduleSizing: ModuleSizingResult | null;
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
            <PreviewRow
              label="Energia de geração"
              value={result
                ? `${result.targetDailyGenerationKwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh/dia`
                : 'Aguardando HSP'}
            />
            <PreviewRow label="Potência necessária" value={result ? `${number.format(result.requiredPowerKwp)} kWp` : 'Aguardando HSP'} highlight />
            {moduleQuantity != null && <PreviewRow label="Quantidade de módulos" value={`${moduleQuantity} módulos`} />}
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
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              {result.selectedKitIsAdequate ? 'Kit compatível com a potência calculada.' : 'Kit abaixo da potência calculada.'}
            </div>
          </div>
        )}

        <p className="border-t border-brand-border pt-4 text-xs leading-5 text-slate-500">
          Os módulos e o inversor são definidos pelo kit cadastrado pelo usuário.
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
