import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Loader2,
  MapPin,
  PackageCheck,
  SunMedium,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  calculateProfessionalSizing,
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
} from '../../lib/calculations/professionalSizing';
import { solarKitService } from '../../services/solarKitService';
import type { SolarKit } from '../../types/solarKit';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

const STEPS = [
  { title: 'Consumo', icon: ClipboardList },
  { title: 'Irradiação e potência', icon: SunMedium },
  { title: 'Kit e resultado', icon: PackageCheck },
] as const;

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return Number.NaN;
  return Number(normalized);
};

function Field({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = '0.01',
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string;
  helper?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-brand-dark">{label}</span>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
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
  const [currentStep, setCurrentStep] = useState(0);
  const [monthlyConsumption, setMonthlyConsumption] = useState<string[]>(
    () => Array.from({ length: 12 }, () => ''),
  );
  const [connectionType, setConnectionType] = useState<ConnectionType>('monophase');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [hspDaily, setHspDaily] = useState('');
  const [performanceRatioPercent, setPerformanceRatioPercent] = useState('80');
  const [irradiationSource, setIrradiationSource] = useState('CRESESB/SunData');
  const [kits, setKits] = useState<SolarKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);

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

  const selectedKit = useMemo(
    () => kits.find((kit) => kit.id === selectedKitId) ?? null,
    [kits, selectedKitId],
  );

  const parsedMonthlyConsumption = useMemo(
    () => monthlyConsumption.map(parseNumber),
    [monthlyConsumption],
  );
  const allMonthsFilled = parsedMonthlyConsumption.every(
    (consumption) => Number.isFinite(consumption) && consumption >= 0,
  );

  const calculation = useMemo(() => {
    if (!allMonthsFilled) return { result: null, error: null };

    const hsp = parseNumber(hspDaily);
    const performanceRatio = parseNumber(performanceRatioPercent);
    if (!Number.isFinite(hsp) || !Number.isFinite(performanceRatio)) {
      return { result: null, error: null };
    }

    try {
      return {
        result: calculateProfessionalSizing({
          monthlyConsumptionKwh: parsedMonthlyConsumption,
          connectionType,
          hspDaily: hsp,
          performanceRatioPercent: performanceRatio,
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
    allMonthsFilled,
    connectionType,
    hspDaily,
    parsedMonthlyConsumption,
    performanceRatioPercent,
    selectedKit,
  ]);

  const updateConsumption = (index: number, value: string) => {
    setMonthlyConsumption((current) => current.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )));
  };

  const validateStep = () => {
    if (currentStep === 0) {
      if (!allMonthsFilled) {
        toast.error('Informe o consumo dos 12 meses.');
        return false;
      }

      const annual = parsedMonthlyConsumption.reduce((total, item) => total + item, 0);
      const average = annual / 12;
      const availability = CONNECTION_AVAILABILITY_KWH[connectionType];
      if (average <= availability) {
        toast.error('O consumo médio deve ser maior que o custo de disponibilidade.');
        return false;
      }
    }

    if (currentStep === 1) {
      const parsedLatitude = parseNumber(latitude);
      const parsedLongitude = parseNumber(longitude);
      const parsedHsp = parseNumber(hspDaily);
      const parsedPerformanceRatio = parseNumber(performanceRatioPercent);

      if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        toast.error('Informe uma latitude válida entre -90 e 90.');
        return false;
      }
      if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        toast.error('Informe uma longitude válida entre -180 e 180.');
        return false;
      }
      if (!Number.isFinite(parsedHsp) || parsedHsp <= 0) {
        toast.error('Informe uma HSP diária maior que zero.');
        return false;
      }
      if (!Number.isFinite(parsedPerformanceRatio) || parsedPerformanceRatio < 75 || parsedPerformanceRatio > 80) {
        toast.error('Informe um rendimento global entre 75% e 80%.');
        return false;
      }
      if (!irradiationSource.trim()) {
        toast.error('Informe a fonte utilizada para a HSP.');
        return false;
      }
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const result = calculation.result;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-brand-blue">
            <Gauge className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Dimensionamento profissional</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-dark">Calculadora Fotovoltaica</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Média dos últimos 12 meses, custo de disponibilidade, HSP local, rendimento global e seleção de um kit on-grid já cadastrado.
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/propostas')}>
          <ArrowLeft className="h-4 w-4" /> Voltar para propostas
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <Card className="p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-brand-dark">Progresso</span>
                <span className="text-brand-blue">{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-gray">
                <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <nav className="space-y-2" aria-label="Etapas da calculadora">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = index === currentStep;
                const completed = index < currentStep;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => {
                      if (index <= currentStep || validateStep()) setCurrentStep(index);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                      active
                        ? 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue'
                        : 'border-transparent text-slate-500 hover:bg-brand-gray'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      completed ? 'bg-emerald-100 text-emerald-600' : active ? 'bg-brand-blue text-white' : 'bg-brand-gray text-slate-500'
                    }`}>
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="font-semibold">{step.title}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        <main>
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-brand-border bg-gradient-to-r from-brand-blue/10 via-brand-surface to-brand-yellow/10">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-blue text-white">
                  {currentStep === 0 && <ClipboardList className="h-5 w-5" />}
                  {currentStep === 1 && <SunMedium className="h-5 w-5" />}
                  {currentStep === 2 && <PackageCheck className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
                    Etapa {currentStep + 1} de {STEPS.length}
                  </p>
                  <CardTitle className="text-xl">{STEPS[currentStep].title}</CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {currentStep === 0 && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-brand-dark">Levantamento do consumo</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Transcreva os consumos em kWh das últimas 12 contas de energia.
                    </p>
                  </div>

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

                  <label className="block max-w-md space-y-2">
                    <span className="text-sm font-semibold text-brand-dark">Tipo de ligação</span>
                    <Select value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}>
                      <option value="monophase">Monofásica — 30 kWh</option>
                      <option value="biphase">Bifásica — 50 kWh</option>
                      <option value="triphase">Trifásica — 100 kWh</option>
                    </Select>
                    <p className="text-xs leading-5 text-slate-500">
                      O sistema subtrai automaticamente o custo de disponibilidade da média mensal.
                    </p>
                  </label>

                  {allMonthsFilled && result && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Consumo anual" value={`${number.format(result.annualConsumptionKwh)} kWh`} />
                      <Summary label="Média mensal" value={`${number.format(result.averageMonthlyConsumptionKwh)} kWh`} />
                      <Summary label="Disponibilidade" value={`${result.availabilityConsumptionKwh} kWh`} />
                      <Summary label="Consumo compensável" value={`${number.format(result.compensableMonthlyConsumptionKwh)} kWh/mês`} />
                    </div>
                  )}
                </section>
              )}

              {currentStep === 1 && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-brand-dark">Irradiação solar e potência necessária</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Informe as coordenadas do local e a HSP média diária obtida em uma base oficial.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Latitude" value={latitude} onChange={setLatitude} min={-90} max={90} step="0.000001" helper="Coordenada decimal do local de instalação." />
                    <Field label="Longitude" value={longitude} onChange={setLongitude} min={-180} max={180} step="0.000001" helper="Coordenada decimal do local de instalação." />
                    <Field label="HSP média diária" value={hspDaily} onChange={setHspDaily} suffix="h/dia" min={0.1} step="0.01" helper="Use a média diária obtida para a região e inclinação adotada." />
                    <Field label="Rendimento global" value={performanceRatioPercent} onChange={setPerformanceRatioPercent} suffix="%" min={75} max={80} step="0.5" helper="Faixa adotada neste fluxo: 75% a 80%." />
                    <div className="md:col-span-2">
                      <Field label="Fonte da irradiação" value={irradiationSource} onChange={setIrradiationSource} helper="Exemplo: CRESESB/SunData." />
                    </div>
                  </div>

                  {calculation.error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{calculation.error}</p>
                    </div>
                  )}

                  {result && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Consumo compensável diário" value={`${number.format(result.compensableDailyConsumptionKwh)} kWh/dia`} />
                      <Summary label="HSP adotada" value={`${number.format(parseNumber(hspDaily))} h/dia`} />
                      <Summary label="Rendimento" value={`${number.format(result.performanceRatio * 100)}%`} />
                      <Summary label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} highlight />
                    </div>
                  )}
                </section>
              )}

              {currentStep === 2 && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Escolha um kit on-grid ativo. Os módulos e o inversor já pertencem ao cadastro do kit e não formam etapas separadas.
                    </p>
                  </div>

                  {isLoadingKits ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" /> Carregando kits...
                    </div>
                  ) : kitsError ? (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{kitsError}</p>
                    </div>
                  ) : kits.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-border p-8 text-center">
                      <PackageCheck className="mx-auto h-9 w-9 text-slate-400" />
                      <h3 className="mt-3 font-bold text-brand-dark">Nenhum kit on-grid ativo</h3>
                      <p className="mt-1 text-sm text-slate-500">Cadastre ou ative um kit antes de concluir o dimensionamento.</p>
                      <Button type="button" className="mt-4" onClick={() => navigate('/kits-solares')}>Abrir catálogo de kits</Button>
                    </div>
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
                              <KitDetail label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                              <KitDetail label="Módulos" value={`${selectedKit.module_quantity} × ${number.format(selectedKit.module_power_w)} W`} />
                              <KitDetail label="Módulo" value={[selectedKit.module_brand, selectedKit.module_model].filter(Boolean).join(' ') || 'Não informado'} />
                              <KitDetail label="Inversor" value={[selectedKit.inverter_brand, selectedKit.inverter_model].filter(Boolean).join(' ') || 'Não informado'} />
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
                        <Summary label="Cobertura do compensável" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} highlight />
                      </div>

                      <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4 text-sm text-slate-600">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                          <p>
                            Coordenadas: <strong>{latitude}, {longitude}</strong>. HSP: <strong>{hspDaily} h/dia</strong>. Fonte: <strong>{irradiationSource}</strong>.
                            O saldo energético mensal estimado é de <strong>{number.format(result.selectedKitEnergyBalanceKwh ?? 0)} kWh</strong> em relação ao consumo compensável médio.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-brand-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                {currentStep < STEPS.length - 1 && (
                  <Button type="button" className="gap-2" onClick={goNext}>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
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

function KitDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-brand-dark">{value}</dd>
    </div>
  );
}
