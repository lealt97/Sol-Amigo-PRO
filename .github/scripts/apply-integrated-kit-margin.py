from pathlib import Path
import re

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'Pattern not found in {path}: {old[:100]!r}')
    write(path, source.replace(old, new, 1))


# Draft: pricing mode and layout marker for legacy step migration.
replace_once(
    'src/types/proposalDraft.ts',
    "  proposalPrice?: string;\n  estimatedSystemCost?: string;",
    "  proposalPrice?: string;\n  pricingMode?: 'margin' | 'manual';\n  estimatedSystemCost?: string;",
)
replace_once(
    'src/types/proposalDraft.ts',
    "  version: typeof PROPOSAL_DRAFT_VERSION;\n  currentStep: number;",
    "  version: typeof PROPOSAL_DRAFT_VERSION;\n  flowLayout?: 'kit-in-payback';\n  currentStep: number;",
)

# Payback engine: a manual system cost is also a valid cost basis.
replace_once(
    'src/lib/calculations/payback.ts',
    "  kitCost?: number | null;\n  tariffCentsPerKwh: number;",
    "  kitCost?: number | null;\n  manualSystemCost?: number | null;\n  tariffCentsPerKwh: number;",
)
replace_once(
    'src/lib/calculations/payback.ts',
    "  hasCostBasis: boolean;\n  additionalCostsTotal: number;",
    "  hasCostBasis: boolean;\n  baseSystemCost: number;\n  additionalCostsTotal: number;",
)
replace_once(
    'src/lib/calculations/payback.ts',
    """  const kitCost = input.kitCost ?? null;
  if (kitCost != null) assertPositive(kitCost, 'Custo do kit');

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');""",
    """  const kitCost = input.kitCost ?? null;
  if (kitCost != null) assertPositive(kitCost, 'Custo do kit');
  const manualSystemCost = input.manualSystemCost ?? null;
  if (manualSystemCost != null) assertPositive(manualSystemCost, 'Custo estimado do sistema');
  const baseSystemCost = kitCost ?? manualSystemCost;

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');""",
)
replace_once(
    'src/lib/calculations/payback.ts',
    """  const hasCostBasis = kitCost != null;
  const directCost = hasCostBasis ? kitCost + additionalCostsTotal : input.proposalPrice;""",
    """  const hasCostBasis = baseSystemCost != null;
  const directCost = hasCostBasis ? baseSystemCost + additionalCostsTotal : input.proposalPrice;""",
)
replace_once(
    'src/lib/calculations/payback.ts',
    """    kitCost: round(kitCost ?? 0),
    hasCostBasis,
    additionalCostsTotal: round(additionalCostsTotal),""",
    """    kitCost: round(kitCost ?? 0),
    hasCostBasis,
    baseSystemCost: round(baseSystemCost ?? 0),
    additionalCostsTotal: round(additionalCostsTotal),""",
)

# Profile fallback and commercial default.
replace_once(
    'src/services/profileService.ts',
    """      const defaultProfile = {
        id: userId,
        name: '',
        company_name: '',
      };""",
    """      const defaultProfile = {
        id: userId,
        name: '',
        company_name: '',
        default_margin_percentage: 30,
        default_validity_days: 7,
      };""",
)
replace_once(
    'src/pages/Configuracoes.tsx',
    """        const data = await profileService.getProfile(user.id);
        setProfile(data);
        applyPlatformTheme(data.platform_theme || null);""",
    """        const data = await profileService.getProfile(user.id);
        const normalizedProfile: Profile = {
          ...data,
          default_margin_percentage: data.default_margin_percentage ?? 30,
          default_validity_days: data.default_validity_days ?? 7,
        };
        setProfile(normalizedProfile);
        applyPlatformTheme(normalizedProfile.platform_theme || null);""",
)
replace_once(
    'src/pages/Configuracoes.tsx',
    """                  <input type=\"number\" name=\"default_margin_percentage\" value={profile.default_margin_percentage || ''} onChange={handleNumberChange} className={inputClassName} />
                  <p className=\"text-xs text-slate-500\">Esta margem será aplicada automaticamente ao criar uma nova proposta.</p>""",
    """                  <input type=\"number\" name=\"default_margin_percentage\" min={0} max={99.99} step=\"0.01\" value={profile.default_margin_percentage ?? 30} onChange={handleNumberChange} className={inputClassName} />
                  <p className=\"text-xs text-slate-500\">O padrão inicial é 30%. A margem é calculada sobre o preço de venda e pode ser alterada em cada proposta.</p>""",
)
replace_once(
    'supabase-schema.sql',
    "  default_margin_percentage NUMERIC,\n  default_validity_days INTEGER,",
    "  default_margin_percentage NUMERIC DEFAULT 30,\n  default_validity_days INTEGER DEFAULT 7,",
)

migration = """-- Margem comercial padrão para propostas novas.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_margin_percentage NUMERIC;

ALTER TABLE public.profiles
  ALTER COLUMN default_margin_percentage SET DEFAULT 30;

UPDATE public.profiles
SET default_margin_percentage = 30
WHERE default_margin_percentage IS NULL;
"""
write('supabase/migrations/20260731220000_default_margin_30.sql', migration)

# Payback step: restore profile margin, pricing modes and manual cost basis.
payback_path = 'src/pages/propostas/PaybackStep.tsx'
payback = read(payback_path)
payback = payback.replace(
    "import { Input } from '../../components/ui/Input';\n",
    "import { Input } from '../../components/ui/Input';\nimport { useAuth } from '../../contexts/AuthContext';\n",
    1,
)
payback = payback.replace(
    "import type { ProposalDraftPaybackForm } from '../../types/proposalDraft';\n",
    "import { profileService } from '../../services/profileService';\nimport type { ProposalDraftPaybackForm } from '../../types/proposalDraft';\n",
    1,
)
payback = payback.replace(
    """const createDefaultForm = (): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  averageMonthlyBillAmount: '',
  proposalPrice: '',
  estimatedSystemCost: '',""",
    """const createDefaultForm = (margin = 30): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  averageMonthlyBillAmount: '',
  proposalPrice: '',
  pricingMode: 'margin',
  estimatedSystemCost: '',""",
    1,
)
payback = payback.replace("  marginPercentage: '',\n", "  marginPercentage: String(margin),\n", 1)

normalize_start = payback.index('const normalizeForm = ')
normalize_end = payback.index('\nconst parseNumber', normalize_start)
normalize_block = r'''const normalizeForm = (form: ProposalDraftPaybackForm, defaultMargin = 30): PaybackFormState => {
  const proposalPrice = typeof form.proposalPrice === 'string'
    ? form.proposalPrice
    : typeof form.estimatedSystemCost === 'string'
      ? form.estimatedSystemCost
      : '';
  const pricingMode = form.pricingMode === 'margin' || form.pricingMode === 'manual'
    ? form.pricingMode
    : proposalPrice.trim()
      ? 'manual'
      : 'margin';
  const normalized = {
    ...form,
    proposalPrice,
    pricingMode,
    averageMonthlyBillAmount: typeof form.averageMonthlyBillAmount === 'string' ? form.averageMonthlyBillAmount : '',
    estimatedSystemCost: typeof form.estimatedSystemCost === 'string' ? form.estimatedSystemCost : '',
    analysisYears: typeof form.analysisYears === 'string' ? form.analysisYears : '25',
    annualTariffEscalationPercent: typeof form.annualTariffEscalationPercent === 'string' ? form.annualTariffEscalationPercent : '4.5',
    annualGenerationDegradationPercent: typeof form.annualGenerationDegradationPercent === 'string' ? form.annualGenerationDegradationPercent : '0.5',
    annualOperationMaintenancePercent: typeof form.annualOperationMaintenancePercent === 'string' ? form.annualOperationMaintenancePercent : '0.5',
    discountRatePercent: typeof form.discountRatePercent === 'string' ? form.discountRatePercent : '8',
    compensationFactorPercent: typeof form.compensationFactorPercent === 'string' ? form.compensationFactorPercent : '100',
    inverterReplacementYear: typeof form.inverterReplacementYear === 'string' ? form.inverterReplacementYear : '12',
    inverterReplacementCost: typeof form.inverterReplacementCost === 'string' ? form.inverterReplacementCost : '',
    marginPercentage: typeof form.marginPercentage === 'string' && form.marginPercentage.trim()
      ? form.marginPercentage
      : String(defaultMargin),
  };

  const unchanged = Object.entries(normalized).every(([key, value]) => (
    form[key as keyof ProposalDraftPaybackForm] === value
  ));
  return unchanged ? form : normalized;
};
'''
payback = payback[:normalize_start] + normalize_block + payback[normalize_end:]

payback = payback.replace(
    """}) {
  const storageKey = 'sol-amigo:payback:direct-proposal-price';
  const [form, setForm] = useState<PaybackFormState>(() => normalizeForm(initialForm || createDefaultForm()));""",
    """}) {
  const { user } = useAuth();
  const storageKey = 'sol-amigo:payback:pricing-v2';
  const [form, setForm] = useState<PaybackFormState>(() => normalizeForm(initialForm || createDefaultForm(30), 30));""",
    1,
)

hydrate_start = payback.index("  useEffect(() => {\n    let active = true;", payback.index("const [hydrated"))
hydrate_end = payback.index("\n\n  useEffect(() => {\n    if (!hydrated)", hydrate_start)
hydrate_block = r'''  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      setHydrated(false);
      let defaultMargin = 30;

      if (user?.id) {
        try {
          const profile = await profileService.getProfile(user.id);
          const configuredMargin = Number(profile.default_margin_percentage);
          if (Number.isFinite(configuredMargin) && configuredMargin >= 0 && configuredMargin < 100) {
            defaultMargin = configuredMargin;
          }
        } catch {
          defaultMargin = 30;
        }
      }

      if (initialForm) {
        if (active) setForm(normalizeForm(initialForm, defaultMargin));
        if (active) setHydrated(true);
        return;
      }

      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PaybackFormState;
          if (active) setForm(normalizeForm(parsed, defaultMargin));
          if (active) setHydrated(true);
          return;
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }

      if (active) {
        setForm(createDefaultForm(defaultMargin));
        setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [initialForm, storageKey, user?.id]);'''
payback = payback[:hydrate_start] + hydrate_block + payback[hydrate_end:]

calculation_start = payback.index('  const calculation = useMemo(() => {')
calculation_end = payback.index('\n\n  useEffect(() => {\n    onResultChange', calculation_start)
calculation_block = r'''  const pricingMode = form.pricingMode === 'manual' ? 'manual' : 'margin';

  const calculation = useMemo(() => {
    if (!hydrated) return { result: null, error: null };

    try {
      const additionalCosts = form.additionalCosts.map((cost) => ({
        description: cost.description.trim() || 'Custo adicional',
        amount: parseNumber(cost.amount || '0'),
      }));
      const baseSystemCost = selectedKit?.cost_price ?? parseNumber(form.estimatedSystemCost || '');
      if (!Number.isFinite(baseSystemCost) || baseSystemCost <= 0) {
        throw new Error(selectedKit
          ? 'O kit selecionado precisa possuir um custo válido.'
          : 'Informe o custo estimado do sistema para calcular preço, lucro e margem.');
      }

      const additionalCostsTotal = additionalCosts.reduce((total, cost) => total + cost.amount, 0);
      const directCost = baseSystemCost + additionalCostsTotal;
      const requestedMargin = parseNumber(form.marginPercentage || '30');
      if (pricingMode === 'margin' && (!Number.isFinite(requestedMargin) || requestedMargin < 0 || requestedMargin >= 100)) {
        throw new Error('A margem de lucro deve estar entre 0% e 99,99%.');
      }

      const proposalPrice = pricingMode === 'margin'
        ? directCost / (1 - requestedMargin / 100)
        : parseNumber(form.proposalPrice || '');

      return {
        result: calculatePayback({
          proposalPrice,
          kitCost: selectedKit?.cost_price ?? null,
          manualSystemCost: selectedKit ? null : baseSystemCost,
          tariffCentsPerKwh: parseNumber(form.tariffCentsPerKwh),
          averageMonthlyBillAmount: form.averageMonthlyBillAmount?.trim()
            ? parseNumber(form.averageMonthlyBillAmount)
            : null,
          monthlyAvailabilityConsumptionKwh: CONNECTION_AVAILABILITY_KWH[connectionType],
          pisPercent: parseNumber(form.pisPercent),
          cofinsPercent: parseNumber(form.cofinsPercent),
          icmsPercent: parseNumber(form.icmsPercent),
          otherTariffsPercent: parseNumber(form.otherTariffsPercent),
          monthlyCompensableConsumptionKwh,
          monthlyGenerationKwh,
          additionalCosts,
          analysisYears: parseNumber(form.analysisYears || '25'),
          annualTariffEscalationPercent: parseNumber(form.annualTariffEscalationPercent || '4.5'),
          annualGenerationDegradationPercent: parseNumber(form.annualGenerationDegradationPercent || '0.5'),
          annualOperationMaintenancePercent: parseNumber(form.annualOperationMaintenancePercent || '0.5'),
          discountRatePercent: parseNumber(form.discountRatePercent || '8'),
          compensationFactorPercent: parseNumber(form.compensationFactorPercent || '100'),
          inverterReplacementYear: form.inverterReplacementYear?.trim()
            ? parseNumber(form.inverterReplacementYear)
            : null,
          inverterReplacementCost: form.inverterReplacementCost?.trim()
            ? parseNumber(form.inverterReplacementCost)
            : 0,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular o payback.',
      };
    }
  }, [
    connectionType,
    form,
    hydrated,
    monthlyCompensableConsumptionKwh,
    monthlyGenerationKwh,
    pricingMode,
    selectedKit,
  ]);'''
payback = payback[:calculation_start] + calculation_block + payback[calculation_end:]

result_marker = '  const result = calculation.result;\n'
payback = payback.replace(
    result_marker,
    result_marker + r'''  const switchPricingMode = (mode: 'margin' | 'manual') => {
    setForm((current) => ({
      ...current,
      pricingMode: mode,
      proposalPrice: mode === 'manual' && !current.proposalPrice?.trim() && result
        ? String(result.totalInvestment)
        : current.proposalPrice,
    }));
  };
''',
    1,
)

ui_start = payback.index('      <div className="grid gap-4 md:grid-cols-2">', payback.index('Esta análise é preliminar'))
ui_end = payback.index('\n      <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">', ui_start)
pricing_ui = r'''      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Base de custos</p>
            {selectedKit ? (
              <>
                <h3 className="mt-2 font-bold text-brand-dark">{selectedKit.name}</h3>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custo do kit</p>
                    <p className="mt-1 text-lg font-bold text-brand-dark">{currency.format(selectedKit.cost_price)}</p>
                  </div>
                  {selectedKit.sale_price != null && selectedKit.sale_price > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Venda cadastrada</p>
                      <p className="mt-1 text-lg font-bold text-brand-dark">{currency.format(selectedKit.sale_price)}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-4">
                <p className="text-sm leading-6 text-slate-500">
                  Sem kit cadastrado, informe uma estimativa do custo dos equipamentos e serviços principais.
                </p>
                <PaybackField
                  label="Custo estimado do sistema"
                  value={form.estimatedSystemCost || ''}
                  onChange={(value) => updateField('estimatedSystemCost', value)}
                  prefix="R$"
                  min={0.01}
                  helper="Esse valor forma a base para calcular preço, lucro e margem, mesmo sem um kit definido."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Tipo de ligação</p>
            <h3 className="mt-2 font-bold text-brand-dark">{CONNECTION_LABELS[connectionType]}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Custo de disponibilidade considerado no consumo: <strong>{CONNECTION_AVAILABILITY_KWH[connectionType]} kWh/mês</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Formação do preço</p>
          <h3 className="mt-1 font-bold text-brand-dark">Escolha como definir o valor da proposta</h3>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => switchPricingMode('margin')}
            className={`rounded-xl border p-4 text-left transition ${pricingMode === 'margin'
              ? 'border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/20'
              : 'border-brand-border bg-brand-gray/20 hover:border-brand-blue/30'}`}
          >
            <p className="font-bold text-brand-dark">Calcular pela margem</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">O preço é formado automaticamente a partir do custo total e da margem desejada.</p>
          </button>
          <button
            type="button"
            onClick={() => switchPricingMode('manual')}
            className={`rounded-xl border p-4 text-left transition ${pricingMode === 'manual'
              ? 'border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/20'
              : 'border-brand-border bg-brand-gray/20 hover:border-brand-blue/30'}`}
          >
            <p className="font-bold text-brand-dark">Informar preço manual</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Digite o preço final e veja a margem efetiva calculada pelo sistema.</p>
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {pricingMode === 'margin' ? (
            <PaybackField
              label="Margem de lucro"
              value={form.marginPercentage || '30'}
              onChange={(value) => updateField('marginPercentage', value)}
              suffix="%"
              min={0}
              max={99.99}
              helper="Carregada de Configurações da Conta > Preferências Comerciais. É margem sobre o preço de venda, não simples acréscimo sobre o custo."
            />
          ) : (
            <PaybackField
              label="Preço da proposta"
              value={form.proposalPrice || ''}
              onChange={(value) => updateField('proposalPrice', value)}
              prefix="R$"
              min={0.01}
              helper="O lucro e a margem efetiva serão calculados usando a base de custos informada."
            />
          )}

          {result && (
            <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                {pricingMode === 'margin' ? 'Preço calculado' : 'Margem calculada'}
              </p>
              <p className="mt-2 text-2xl font-bold text-brand-dark">
                {pricingMode === 'margin'
                  ? currency.format(result.totalInvestment)
                  : `${decimal.format(result.marginPercentage)}%`}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Custo direto de {currency.format(result.directCost)} e lucro estimado de {currency.format(result.profitAmount)}.
              </p>
            </div>
          )}
        </div>

        {selectedKit?.sale_price != null && selectedKit.sale_price > 0 && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setForm((current) => ({
                ...current,
                pricingMode: 'manual',
                proposalPrice: String(selectedKit.sale_price ?? ''),
              }));
            }}
          >
            Usar preço de venda cadastrado: {currency.format(selectedKit.sale_price)}
          </Button>
        )}
      </div>
'''
payback = payback[:ui_start] + pricing_ui + payback[ui_end:]
payback = payback.replace(
    'Calculada com o custo do kit de referência e os custos adicionais informados. Ela não altera o preço da proposta.',
    "Calculada com a base de custos do kit ou com o custo estimado informado, somada aos custos adicionais.",
    1,
)
payback = payback.replace(
    'O payback foi calculado pelo preço informado. A rentabilidade interna ficará disponível quando um kit de referência for selecionado.',
    'Informe uma base de custos válida para calcular lucro e margem da proposta.',
    1,
)
write(payback_path, payback)

# Wizard: remove the standalone kit step and integrate it into Price and payback.
calculator_path = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = read(calculator_path)
calculator = calculator.replace("  { id: 'kit', title: 'Kit de referência (opcional)' },\n", '', 1)
calculator = calculator.replace(
    """    setCurrentStep(startAtBeginning ? 0 : clampProposalFlowStep(state.currentStep));""",
    """    const rawStoredStep = Number(state.currentStep);
    const boundedStoredStep = Number.isInteger(rawStoredStep)
      ? Math.min(7, Math.max(0, rawStoredStep))
      : 0;
    const migratedStep = state.flowLayout === 'kit-in-payback'
      ? boundedStoredStep
      : boundedStoredStep >= 5
        ? boundedStoredStep - 1
        : boundedStoredStep;
    setCurrentStep(startAtBeginning ? 0 : clampProposalFlowStep(migratedStep));""",
    1,
)
calculator = calculator.replace("    if (currentStep === 5 && !paybackResult) {", "    if (currentStep === 4 && !paybackResult) {", 1)
calculator = calculator.replace(
    """    version: PROPOSAL_DRAFT_VERSION,
    currentStep: step,""",
    """    version: PROPOSAL_DRAFT_VERSION,
    flowLayout: 'kit-in-payback',
    currentStep: step,""",
    1,
)
calculator = calculator.replace(
    """    const margin = selectedKit ? paybackResult?.marginPercentage ?? null : null;""",
    """    const hasCostBasis = paybackResult?.hasCostBasis === true;
    const margin = hasCostBasis ? paybackResult?.marginPercentage ?? null : null;""",
    1,
)
calculator = calculator.replace("      other_costs: selectedKit ? paybackResult?.additionalCostsTotal ?? null : null,", "      other_costs: hasCostBasis ? paybackResult?.additionalCostsTotal ?? null : null,", 1)
calculator = calculator.replace("      total_cost: selectedKit ? paybackResult?.directCost ?? null : null,", "      total_cost: hasCostBasis ? paybackResult?.directCost ?? null : null,", 1)
calculator = calculator.replace("      estimated_profit: selectedKit ? paybackResult?.profitAmount ?? null : null,", "      estimated_profit: hasCostBasis ? paybackResult?.profitAmount ?? null : null,", 1)
calculator = calculator.replace('Kit solar de referência — opcional', 'Composição técnica da proposta', 1)
calculator = calculator.replace(
    'Selecione um kit apenas quando ele já estiver definido. Sem kit, a pré-proposta usa a potência necessária calculada e o preço informado diretamente na próxima etapa.',
    'Escolha usar um kit cadastrado ou mantenha os equipamentos a definir. O custo, o preço, o lucro, a margem e o payback são configurados nesta mesma etapa.',
    1,
)
calculator = calculator.replace('Kit solar de referência (opcional)', 'Usar kit cadastrado (opcional)', 1)
calculator = calculator.replace('<option value="">Selecione um kit cadastrado</option>', '<option value="">Sem kit cadastrado — informar custo estimado</option>', 1)

old_boundary = """                  </>
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
                <ErrorState message=\"Informe consumo, HSP e rendimento-base antes de calcular o investimento e o payback.\" />
              )
            )}

            {currentStep === 6 && ("""
new_boundary = """                  </>
                )}

                <div className=\"border-t border-brand-border pt-7\">
                  {result ? (
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
                    <ErrorState message=\"Informe consumo, HSP e rendimento-base antes de calcular o investimento e o payback.\" />
                  )}
                </div>
              </section>
            )}

            {currentStep === 5 && ("""
if old_boundary not in calculator:
    raise RuntimeError('Could not locate kit/payback step boundary in calculator')
calculator = calculator.replace(old_boundary, new_boundary, 1)
write(calculator_path, calculator)

# Tests: align the navigation contract and assert margin behavior.
payback_flow_test = r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const VIEW = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const PAYBACK_STEP = 'src/pages/propostas/PaybackStep.tsx';

test('kit deixa de ser etapa e passa a integrar preço e payback', async () => {
  const calculator = await readFile(VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'modules', title: 'Telhado \(opcional\)'[\s\S]*id: 'payback', title: 'Preço e payback'[\s\S]*id: 'result', title: 'Resultado'/,
  );
  assert.doesNotMatch(calculator, /id: 'kit'/);
  assert.match(calculator, /currentStep === 4[\s\S]*Composição técnica da proposta[\s\S]*<PaybackStep/);
  assert.match(calculator, /currentStep === 5[\s\S]*Resultado do dimensionamento/);
  assert.match(calculator, /if \(currentStep === 4 && !paybackResult\)/);
  assert.match(calculator, /Sem kit cadastrado — informar custo estimado/);
});

test('a etapa oferece preço por margem ou manual e mantém análise financeira avançada', async () => {
  const payback = await readFile(PAYBACK_STEP, 'utf8');

  assert.match(payback, /Calcular pela margem/);
  assert.match(payback, /Informar preço manual/);
  assert.match(payback, /label=\"Margem de lucro\"/);
  assert.match(payback, /label=\"Preço da proposta\"/);
  assert.match(payback, /label=\"Custo estimado do sistema\"/);
  assert.match(payback, /defaultMargin = 30/);
  assert.match(payback, /profile\.default_margin_percentage/);
  assert.match(payback, /manualSystemCost/);
  assert.match(payback, /Adicionar custo/);
  assert.match(payback, /Payback descontado/);
  assert.match(payback, /TIR estimada/);
  assert.match(payback, /<BarChart/);
  assert.match(payback, /dataKey=\"cumulativeBalance\"/);
  assert.match(payback, /dataKey=\"discountedCumulativeBalance\"/);
});

test('a etapa apresenta todas as classificações solicitadas', async () => {
  const calculation = await readFile('src/lib/calculations/payback.ts', 'utf8');

  assert.match(calculation, /Excelente/);
  assert.match(calculation, /Muito bom/);
  assert.match(calculation, /Bom/);
  assert.match(calculation, /Regular/);
  assert.match(calculation, /Inviável/);
});
'''
write('tests/payback-flow.test.ts', payback_flow_test)

preproposal_test = r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('pré-proposta não exige telhado nem kit e mantém ressalva de vistoria', async () => {
  const [calculator, payback, draft, technical, publicPage] = await Promise.all([
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
    readFile('src/components/pdf/sections/TechnicalSection.tsx', 'utf8'),
    readFile('src/pages/public/PublicProposal.tsx', 'utf8'),
  ]);

  assert.match(calculator, /Telhado \(opcional\)/);
  assert.doesNotMatch(calculator, /id: 'kit'/);
  assert.match(calculator, /Composição técnica da proposta/);
  assert.match(calculator, /Sem kit cadastrado — informar custo estimado/);
  assert.match(calculator, /hasRoofTechnicalData && !roofOrientationResult/);
  assert.doesNotMatch(calculator, /toast\.error\('Selecione um kit on-grid cadastrado\.'/);
  assert.match(calculator, /selectedKit\?\.name \?\? 'A definir após vistoria'/);
  assert.match(payback, /selectedKit: SolarKit \| null/);
  assert.match(payback, /Custo estimado do sistema/);
  assert.match(payback, /Margem de lucro/);
  assert.match(draft, /pricingMode\?: 'margin' \| 'manual'/);
  assert.match(draft, /flowLayout\?: 'kit-in-payback'/);
  assert.match(technical, /Solução Técnica Preliminar/);
  assert.match(technical, /Esta é uma pré-proposta comercial/);
  assert.match(publicPage, /Pré-proposta Comercial/);
  assert.match(publicPage, /ajustados após a vistoria técnica/);
});
'''
write('tests/preproposal-optional-technical.test.ts', preproposal_test)

with (ROOT / 'tests/payback.test.ts').open('a', encoding='utf-8') as handle:
    handle.write(r'''

test('calcula lucro e margem usando custo manual quando não há kit', () => {
  const result = calculatePayback({
    ...BASE_INPUT,
    proposalPrice: 20_000,
    kitCost: null,
    manualSystemCost: 12_000,
    additionalCosts: [{ description: 'Instalação', amount: 2_000 }],
    annualTariffEscalationPercent: 0,
    annualGenerationDegradationPercent: 0,
    annualOperationMaintenancePercent: 0,
    discountRatePercent: 0,
  });

  assert.equal(result.hasCostBasis, true);
  assert.equal(result.baseSystemCost, 12_000);
  assert.equal(result.directCost, 14_000);
  assert.equal(result.profitAmount, 6_000);
  assert.equal(result.marginPercentage, 30);
});
''')

settings_test = r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preferências comerciais usam margem padrão de 30%', async () => {
  const [settings, profileService, schema, migration] = await Promise.all([
    readFile('src/pages/Configuracoes.tsx', 'utf8'),
    readFile('src/services/profileService.ts', 'utf8'),
    readFile('supabase-schema.sql', 'utf8'),
    readFile('supabase/migrations/20260731220000_default_margin_30.sql', 'utf8'),
  ]);

  assert.match(settings, /default_margin_percentage \?\? 30/);
  assert.match(settings, /O padrão inicial é 30%/);
  assert.match(profileService, /default_margin_percentage: 30/);
  assert.match(schema, /default_margin_percentage NUMERIC DEFAULT 30/);
  assert.match(migration, /ALTER COLUMN default_margin_percentage SET DEFAULT 30/);
  assert.match(migration, /WHERE default_margin_percentage IS NULL/);
});
'''
write('tests/default-commercial-margin.test.ts', settings_test)

print('Integrated kit selection and margin pricing changes applied.')
