from pathlib import Path

ROOT = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:160]!r}')
    file.write_text(text.replace(old, new, 1))


marker = ROOT / 'tests/direct-proposal-price.test.ts'
if marker.exists():
    print('Preço direto da proposta já aplicado.')
    raise SystemExit(0)

replace_once(
    'src/types/proposalDraft.ts',
    """  averageMonthlyBillAmount?: string;
  estimatedSystemCost?: string;
  pisPercent: string;
  cofinsPercent: string;
  icmsPercent: string;
  otherTariffsPercent: string;
  marginPercentage: string;""",
    """  averageMonthlyBillAmount?: string;
  proposalPrice?: string;
  estimatedSystemCost?: string; // Campo legado: migrado automaticamente para proposalPrice.
  pisPercent: string;
  cofinsPercent: string;
  icmsPercent: string;
  otherTariffsPercent: string;
  marginPercentage?: string; // Campo legado: a margem agora é calculada pelo preço informado.""",
)

(ROOT / 'src/lib/calculations/payback.ts').write_text("""export type PaybackStatus = 'excellent' | 'very_good' | 'good' | 'regular' | 'unfeasible';
export type BillReferenceStatus = 'not_informed' | 'consistent' | 'review';

export type PaybackAdditionalCost = {
  description: string;
  amount: number;
};

export type PaybackInput = {
  proposalPrice: number;
  kitCost?: number | null;
  tariffCentsPerKwh: number;
  averageMonthlyBillAmount?: number | null;
  monthlyAvailabilityConsumptionKwh?: number;
  pisPercent: number;
  cofinsPercent: number;
  icmsPercent: number;
  otherTariffsPercent: number;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  additionalCosts: PaybackAdditionalCost[];
  projectionYears?: number;
};

export type PaybackChartPoint = {
  year: number;
  cumulativeBalance: number;
};

export type PaybackResult = {
  kitCost: number;
  hasCostBasis: boolean;
  additionalCostsTotal: number;
  directCost: number;
  marginPercentage: number;
  profitAmount: number;
  totalInvestment: number;
  totalTariffsPercent: number;
  effectiveTariffPerKwh: number;
  estimatedEnergyBillAmount: number;
  averageMonthlyBillAmount: number | null;
  estimatedResidualBillAmount: number | null;
  estimatedBillReductionPercent: number | null;
  billReferenceDifferencePercent: number | null;
  billReferenceStatus: BillReferenceStatus;
  compensatedEnergyKwhPerMonth: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  paybackMonths: number;
  status: PaybackStatus;
  statusLabel: string;
  chartData: PaybackChartPoint[];
};

export const PAYBACK_STATUS_LABELS: Record<PaybackStatus, string> = {
  excellent: 'Excelente',
  very_good: 'Muito bom',
  good: 'Bom',
  regular: 'Regular',
  unfeasible: 'Inviável',
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} deve ser igual ou maior que zero.`);
  }
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} deve ser maior que zero.`);
  }
};

export function classifyPayback(paybackYears: number): PaybackStatus {
  if (!Number.isFinite(paybackYears) || paybackYears > 10) return 'unfeasible';
  if (paybackYears <= 3) return 'excellent';
  if (paybackYears <= 5) return 'very_good';
  if (paybackYears <= 7) return 'good';
  return 'regular';
}

export function calculatePayback(input: PaybackInput): PaybackResult {
  assertPositive(input.proposalPrice, 'Preço da proposta');

  const kitCost = input.kitCost ?? null;
  if (kitCost != null) assertPositive(kitCost, 'Custo do kit');

  assertPositive(input.tariffCentsPerKwh, 'Tarifa de energia');
  const averageMonthlyBillAmount = input.averageMonthlyBillAmount ?? null;
  if (averageMonthlyBillAmount != null) {
    assertPositive(averageMonthlyBillAmount, 'Valor médio mensal da fatura');
  }

  const monthlyAvailabilityConsumptionKwh = input.monthlyAvailabilityConsumptionKwh ?? 0;
  assertNonNegative(monthlyAvailabilityConsumptionKwh, 'Custo de disponibilidade');
  assertNonNegative(input.pisPercent, 'PIS');
  assertNonNegative(input.cofinsPercent, 'COFINS');
  assertNonNegative(input.icmsPercent, 'ICMS');
  assertNonNegative(input.otherTariffsPercent, 'Outros encargos');
  assertPositive(input.monthlyCompensableConsumptionKwh, 'Consumo compensável');
  assertPositive(input.monthlyGenerationKwh, 'Geração mensal');

  const additionalCostsTotal = input.additionalCosts.reduce((total, cost) => {
    assertNonNegative(cost.amount, cost.description || 'Custo adicional');
    return total + cost.amount;
  }, 0);

  const hasCostBasis = kitCost != null;
  const directCost = hasCostBasis ? kitCost + additionalCostsTotal : input.proposalPrice;
  const profitAmount = hasCostBasis ? input.proposalPrice - directCost : 0;
  const marginPercentage = hasCostBasis
    ? (profitAmount / input.proposalPrice) * 100
    : 0;
  const totalInvestment = input.proposalPrice;

  const totalTariffsPercent = input.pisPercent
    + input.cofinsPercent
    + input.icmsPercent
    + input.otherTariffsPercent;
  const effectiveTariffPerKwh = (input.tariffCentsPerKwh / 100) * (1 + totalTariffsPercent / 100);
  const compensatedEnergyKwhPerMonth = Math.min(
    input.monthlyCompensableConsumptionKwh,
    input.monthlyGenerationKwh,
  );
  const monthlySavings = compensatedEnergyKwhPerMonth * effectiveTariffPerKwh;
  const estimatedEnergyBillAmount = (
    input.monthlyCompensableConsumptionKwh + monthlyAvailabilityConsumptionKwh
  ) * effectiveTariffPerKwh;
  const minimumResidualBillAmount = monthlyAvailabilityConsumptionKwh * effectiveTariffPerKwh;
  const estimatedResidualBillAmount = averageMonthlyBillAmount == null
    ? null
    : Math.min(
        averageMonthlyBillAmount,
        Math.max(averageMonthlyBillAmount - monthlySavings, minimumResidualBillAmount),
      );
  const estimatedBillReductionPercent = averageMonthlyBillAmount == null || estimatedResidualBillAmount == null
    ? null
    : ((averageMonthlyBillAmount - estimatedResidualBillAmount) / averageMonthlyBillAmount) * 100;
  const billReferenceDifferencePercent = averageMonthlyBillAmount == null
    ? null
    : (Math.abs(averageMonthlyBillAmount - estimatedEnergyBillAmount)
      / Math.max(averageMonthlyBillAmount, estimatedEnergyBillAmount)) * 100;
  const billReferenceStatus: BillReferenceStatus = billReferenceDifferencePercent == null
    ? 'not_informed'
    : billReferenceDifferencePercent <= 20
      ? 'consistent'
      : 'review';
  const annualSavings = monthlySavings * 12;
  const paybackYears = annualSavings > 0 ? totalInvestment / annualSavings : Number.POSITIVE_INFINITY;
  const status = classifyPayback(paybackYears);
  const projectionYears = Math.min(40, Math.max(1, Math.trunc(input.projectionYears ?? 25)));
  const chartData = Array.from({ length: projectionYears + 1 }, (_, year) => ({
    year,
    cumulativeBalance: round((annualSavings * year) - totalInvestment),
  }));

  return {
    kitCost: round(kitCost ?? 0),
    hasCostBasis,
    additionalCostsTotal: round(additionalCostsTotal),
    directCost: round(directCost),
    marginPercentage: round(marginPercentage),
    profitAmount: round(profitAmount),
    totalInvestment: round(totalInvestment),
    totalTariffsPercent: round(totalTariffsPercent),
    effectiveTariffPerKwh: round(effectiveTariffPerKwh, 4),
    estimatedEnergyBillAmount: round(estimatedEnergyBillAmount),
    averageMonthlyBillAmount: averageMonthlyBillAmount == null ? null : round(averageMonthlyBillAmount),
    estimatedResidualBillAmount: estimatedResidualBillAmount == null ? null : round(estimatedResidualBillAmount),
    estimatedBillReductionPercent: estimatedBillReductionPercent == null ? null : round(estimatedBillReductionPercent),
    billReferenceDifferencePercent: billReferenceDifferencePercent == null ? null : round(billReferenceDifferencePercent),
    billReferenceStatus,
    compensatedEnergyKwhPerMonth: round(compensatedEnergyKwhPerMonth),
    monthlySavings: round(monthlySavings),
    annualSavings: round(annualSavings),
    paybackYears: round(paybackYears, 2),
    paybackMonths: Number.isFinite(paybackYears) ? Math.ceil(paybackYears * 12) : Number.POSITIVE_INFINITY,
    status,
    statusLabel: PAYBACK_STATUS_LABELS[status],
    chartData,
  };
}
""")

replace_once('src/pages/propostas/PaybackStep.tsx', "import { useAuth } from '../../contexts/AuthContext';\n", '')
replace_once('src/pages/propostas/PaybackStep.tsx', "import { profileService } from '../../services/profileService';\n", '')

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """const createDefaultForm = (margin = 20): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  averageMonthlyBillAmount: '',
  estimatedSystemCost: '',
  pisPercent: '0',
  cofinsPercent: '0',
  icmsPercent: '0',
  otherTariffsPercent: '0',
  marginPercentage: String(margin),
  additionalCosts: [],
});

const normalizeForm = (form: ProposalDraftPaybackForm): PaybackFormState => {
  if (typeof form.averageMonthlyBillAmount === 'string' && typeof form.estimatedSystemCost === 'string') return form;

  return {
    ...form,
    averageMonthlyBillAmount: typeof form.averageMonthlyBillAmount === 'string' ? form.averageMonthlyBillAmount : '',
    estimatedSystemCost: typeof form.estimatedSystemCost === 'string' ? form.estimatedSystemCost : '',
  };
};""",
    """const createDefaultForm = (): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  averageMonthlyBillAmount: '',
  proposalPrice: '',
  estimatedSystemCost: '',
  pisPercent: '0',
  cofinsPercent: '0',
  icmsPercent: '0',
  otherTariffsPercent: '0',
  marginPercentage: '',
  additionalCosts: [],
});

const normalizeForm = (form: ProposalDraftPaybackForm): PaybackFormState => {
  const proposalPrice = typeof form.proposalPrice === 'string'
    ? form.proposalPrice
    : typeof form.estimatedSystemCost === 'string'
      ? form.estimatedSystemCost
      : '';
  const averageMonthlyBillAmount = typeof form.averageMonthlyBillAmount === 'string'
    ? form.averageMonthlyBillAmount
    : '';
  const estimatedSystemCost = typeof form.estimatedSystemCost === 'string'
    ? form.estimatedSystemCost
    : '';
  const marginPercentage = typeof form.marginPercentage === 'string' ? form.marginPercentage : '';

  if (
    form.proposalPrice === proposalPrice
    && form.averageMonthlyBillAmount === averageMonthlyBillAmount
    && form.estimatedSystemCost === estimatedSystemCost
    && form.marginPercentage === marginPercentage
  ) return form;

  return {
    ...form,
    proposalPrice,
    averageMonthlyBillAmount,
    estimatedSystemCost,
    marginPercentage,
  };
};""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """  const { user } = useAuth();
  const storageKey = `sol-amigo:payback:${selectedKit?.id ?? 'manual-estimate'}`;""",
    """  const storageKey = 'sol-amigo:payback:direct-proposal-price';""",
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """      let defaultMargin = 20;
      if (user?.id) {
        try {
          const profile = await profileService.getProfile(user.id);
          if (Number.isFinite(profile.default_margin_percentage)) {
            defaultMargin = Number(profile.default_margin_percentage);
          }
        } catch {
          defaultMargin = 20;
        }
      }

      if (active) {
        setForm(createDefaultForm(defaultMargin));
        setHydrated(true);
      }""",
    """      if (active) {
        setForm(createDefaultForm());
        setHydrated(true);
      }""",
)

replace_once('src/pages/propostas/PaybackStep.tsx', "  }, [initialForm, storageKey, user?.id]);", "  }, [initialForm, storageKey]);")
replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """        result: calculatePayback({
          kitCost: selectedKit?.cost_price ?? parseNumber(form.estimatedSystemCost || ''),
          marginPercentage: parseNumber(form.marginPercentage),""",
    """        result: calculatePayback({
          proposalPrice: parseNumber(form.proposalPrice || form.estimatedSystemCost || ''),
          kitCost: selectedKit?.cost_price ?? null,""",
)

old_base = """      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Base do investimento</p>
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
                <p className="text-sm leading-6 text-slate-500">Nenhum kit foi definido. Informe um custo preliminar para calcular a pré-proposta.</p>
                <PaybackField
                  label="Custo estimado preliminar do sistema"
                  value={form.estimatedSystemCost || ''}
                  onChange={(value) => updateField('estimatedSystemCost', value)}
                  prefix="R$"
                  helper="Estimativa comercial sujeita à definição dos equipamentos e à vistoria técnica."
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
      </div>"""

new_base = """      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Valor comercial</p>
            <div className="mt-4">
              <PaybackField
                label="Preço da proposta"
                value={form.proposalPrice || form.estimatedSystemCost || ''}
                onChange={(value) => updateField('proposalPrice', value)}
                prefix="R$"
                min={0.01}
                helper="Informe o preço que será apresentado ao cliente. Este valor não depende da seleção de um kit."
              />
            </div>
            {selectedKit?.sale_price != null && selectedKit.sale_price > 0 && (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => updateField('proposalPrice', String(selectedKit.sale_price ?? ''))}
              >
                Usar preço de venda cadastrado: {currency.format(selectedKit.sale_price)}
              </Button>
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

      {selectedKit && (
        <Card className="border-brand-blue/20 bg-brand-blue/5 shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Kit de referência — opcional</p>
            <h3 className="mt-2 font-bold text-brand-dark">{selectedKit.name}</h3>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custo interno do kit</p>
                <p className="mt-1 font-bold text-brand-dark">{currency.format(selectedKit.cost_price)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Função no cálculo</p>
                <p className="mt-1 text-slate-600">Referência técnica e cálculo interno de rentabilidade.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}"""
replace_once('src/pages/propostas/PaybackStep.tsx', old_base, new_base)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """          <PaybackField
            label="Margem de lucro"
            value={form.marginPercentage}
            onChange={(value) => updateField('marginPercentage', value)}
            suffix="%"
            max={99.99}
            helper="Carregada de Configurações da Conta > Preferências Comerciais e editável somente nesta proposta."
          />
""",
    '',
)

replace_once(
    'src/pages/propostas/PaybackStep.tsx',
    """          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Investimento final" value={currency.format(result.totalInvestment)} highlight />
            <PaybackSummary label="Lucro estimado" value={currency.format(result.profitAmount)} />
            <PaybackSummary label="Economia mensal" value={currency.format(result.monthlySavings)} />
            <PaybackSummary label="Economia anual" value={currency.format(result.annualSavings)} />
          </div>""",
    """          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Preço da proposta" value={currency.format(result.totalInvestment)} highlight />
            <PaybackSummary label="Economia mensal" value={currency.format(result.monthlySavings)} />
            <PaybackSummary label="Economia anual" value={currency.format(result.annualSavings)} />
            <PaybackSummary label="Payback" value={`${decimal.format(result.paybackYears)} anos`} />
          </div>

          {result.hasCostBasis ? (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
              <h3 className="font-bold text-brand-dark">Rentabilidade interna</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Calculada com o custo do kit de referência e os custos adicionais informados. Ela não altera o preço da proposta.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <PaybackSummary label="Custo direto" value={currency.format(result.directCost)} />
                <PaybackSummary label="Lucro estimado" value={currency.format(result.profitAmount)} />
                <PaybackSummary label="Margem efetiva" value={`${decimal.format(result.marginPercentage)}%`} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4 text-sm leading-6 text-slate-500">
              O payback foi calculado pelo preço informado. A rentabilidade interna ficará disponível quando um kit de referência for selecionado.
            </div>
          )}""",
)

replace_once('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', "{ id: 'payback', title: 'Investimento e payback' },", "{ id: 'payback', title: 'Preço e payback' },")
replace_once('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', "description=\"O cadastro de kit é opcional para a pré-proposta. Você pode continuar e informar um custo estimado na próxima etapa.\"", "description=\"O cadastro de kit é opcional para a pré-proposta. Você pode continuar e informar diretamente o preço da proposta na próxima etapa.\"")
replace_once('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', "Sem kit, a pré-proposta usa a potência necessária calculada e um custo preliminar informado na próxima etapa.", "Sem kit, a pré-proposta usa a potência necessária calculada e o preço informado diretamente na próxima etapa.")

replace_once(
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    """    const margin = paybackResult?.marginPercentage
      ?? (paybackForm ? parseOptionalNumber(paybackForm.marginPercentage) : null);
    const tariff = paybackForm ? parseOptionalNumber(paybackForm.tariffCentsPerKwh) : null;""",
    """    const margin = selectedKit ? paybackResult?.marginPercentage ?? null : null;
    const proposalPrice = paybackResult?.totalInvestment
      ?? (paybackForm
        ? parseOptionalNumber(paybackForm.proposalPrice || paybackForm.estimatedSystemCost || '')
        : null);
    const tariff = paybackForm ? parseOptionalNumber(paybackForm.tariffCentsPerKwh) : null;""",
)

replace_once(
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    """      kit_cost: paybackResult?.kitCost ?? selectedKit?.cost_price ?? null,
      other_costs: paybackResult?.additionalCostsTotal ?? null,
      margin_percentage: margin,
      total_cost: paybackResult?.directCost ?? null,
      gross_price: paybackResult?.totalInvestment ?? null,
      final_price: paybackResult?.totalInvestment ?? null,
      estimated_profit: paybackResult?.profitAmount ?? null,""",
    """      kit_cost: selectedKit?.cost_price ?? null,
      other_costs: selectedKit ? paybackResult?.additionalCostsTotal ?? null : null,
      margin_percentage: margin,
      total_cost: selectedKit ? paybackResult?.directCost ?? null : null,
      gross_price: proposalPrice,
      final_price: proposalPrice,
      estimated_profit: selectedKit ? paybackResult?.profitAmount ?? null : null,""",
)

replace_once('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', '<Summary label="Investimento final" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />', '<Summary label="Preço da proposta" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />')
replace_once(
    'src/pages/propostas/ProfessionalSizingCalculatorView.tsx',
    """                            <PreviewRow label="Custo direto" value={`R$ ${number.format(paybackResult.directCost)}`} />
                            <PreviewRow label="Lucro estimado" value={`R$ ${number.format(paybackResult.profitAmount)}`} />
                            <PreviewRow label="Margem aplicada" value={`${number.format(paybackResult.marginPercentage)}%`} />""",
    """                            <PreviewRow label="Preço da proposta" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />
                            {selectedKit ? (
                              <>
                                <PreviewRow label="Custo direto estimado" value={`R$ ${number.format(paybackResult.directCost)}`} />
                                <PreviewRow label="Lucro estimado" value={`R$ ${number.format(paybackResult.profitAmount)}`} />
                                <PreviewRow label="Margem efetiva" value={`${number.format(paybackResult.marginPercentage)}%`} />
                              </>
                            ) : (
                              <PreviewRow label="Rentabilidade interna" value="Não calculada — kit não definido" />
                            )}""",
)

(ROOT / 'tests/payback.test.ts').write_text("""import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayback, classifyPayback } from '../src/lib/calculations/payback';

test('usa diretamente o preço da proposta e calcula rentabilidade quando há kit', () => {
  const result = calculatePayback({
    proposalPrice: 31_250,
    kitCost: 20_000,
    tariffCentsPerKwh: 100,
    pisPercent: 2,
    cofinsPercent: 3,
    icmsPercent: 5,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 600,
    monthlyGenerationKwh: 500,
    additionalCosts: [
      { description: 'Instalação', amount: 3_000 },
      { description: 'Homologação', amount: 2_000 },
    ],
  });

  assert.equal(result.hasCostBasis, true);
  assert.equal(result.additionalCostsTotal, 5_000);
  assert.equal(result.directCost, 25_000);
  assert.equal(result.totalInvestment, 31_250);
  assert.equal(result.profitAmount, 6_250);
  assert.equal(result.marginPercentage, 20);
  assert.equal(result.effectiveTariffPerKwh, 1.1);
  assert.equal(result.compensatedEnergyKwhPerMonth, 500);
  assert.equal(result.monthlySavings, 550);
  assert.equal(result.annualSavings, 6_600);
  assert.equal(result.paybackYears, 4.73);
  assert.equal(result.paybackMonths, 57);
  assert.equal(result.status, 'very_good');
  assert.equal(result.chartData[0]?.cumulativeBalance, -31_250);
});

test('calcula payback sem kit usando somente o preço informado', () => {
  const result = calculatePayback({
    proposalPrice: 10_000,
    kitCost: null,
    tariffCentsPerKwh: 100,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 300,
    monthlyGenerationKwh: 500,
    additionalCosts: [],
  });

  assert.equal(result.hasCostBasis, false);
  assert.equal(result.totalInvestment, 10_000);
  assert.equal(result.profitAmount, 0);
  assert.equal(result.marginPercentage, 0);
  assert.equal(result.compensatedEnergyKwhPerMonth, 300);
  assert.equal(result.monthlySavings, 300);
});

test('classifica os intervalos de retorno', () => {
  assert.equal(classifyPayback(3), 'excellent');
  assert.equal(classifyPayback(5), 'very_good');
  assert.equal(classifyPayback(7), 'good');
  assert.equal(classifyPayback(10), 'regular');
  assert.equal(classifyPayback(10.01), 'unfeasible');
  assert.equal(classifyPayback(Number.POSITIVE_INFINITY), 'unfeasible');
});

test('rejeita preço da proposta vazio ou igual a zero', () => {
  assert.throws(
    () => calculatePayback({
      proposalPrice: 0,
      kitCost: null,
      tariffCentsPerKwh: 100,
      pisPercent: 0,
      cofinsPercent: 0,
      icmsPercent: 0,
      otherTariffsPercent: 0,
      monthlyCompensableConsumptionKwh: 500,
      monthlyGenerationKwh: 500,
      additionalCosts: [],
    }),
    /Preço da proposta deve ser maior que zero/,
  );
});

test('compara a fatura média com a tarifa e calcula a fatura residual', () => {
  const result = calculatePayback({
    proposalPrice: 10_000,
    kitCost: null,
    tariffCentsPerKwh: 100,
    averageMonthlyBillAmount: 610,
    monthlyAvailabilityConsumptionKwh: 30,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 470,
    monthlyGenerationKwh: 400,
    additionalCosts: [],
  });

  assert.equal(result.estimatedEnergyBillAmount, 500);
  assert.equal(result.averageMonthlyBillAmount, 610);
  assert.equal(result.estimatedResidualBillAmount, 210);
  assert.equal(result.estimatedBillReductionPercent, 65.57);
  assert.equal(result.billReferenceDifferencePercent, 18.03);
  assert.equal(result.billReferenceStatus, 'consistent');
});

test('sinaliza revisão quando a fatura diverge mais de vinte por cento', () => {
  const result = calculatePayback({
    proposalPrice: 10_000,
    kitCost: null,
    tariffCentsPerKwh: 100,
    averageMonthlyBillAmount: 800,
    monthlyAvailabilityConsumptionKwh: 30,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 470,
    monthlyGenerationKwh: 400,
    additionalCosts: [],
  });

  assert.equal(result.estimatedResidualBillAmount, 400);
  assert.equal(result.estimatedBillReductionPercent, 50);
  assert.equal(result.billReferenceDifferencePercent, 37.5);
  assert.equal(result.billReferenceStatus, 'review');
});

test('mantém a comparação opcional quando a fatura não é informada', () => {
  const result = calculatePayback({
    proposalPrice: 10_000,
    kitCost: null,
    tariffCentsPerKwh: 100,
    pisPercent: 0,
    cofinsPercent: 0,
    icmsPercent: 0,
    otherTariffsPercent: 0,
    monthlyCompensableConsumptionKwh: 300,
    monthlyGenerationKwh: 300,
    additionalCosts: [],
  });

  assert.equal(result.averageMonthlyBillAmount, null);
  assert.equal(result.estimatedResidualBillAmount, null);
  assert.equal(result.estimatedBillReductionPercent, null);
  assert.equal(result.billReferenceStatus, 'not_informed');
});
""")

replace_once('tests/payback-flow.test.ts', "/id: 'kit', title: 'Kit de referência \\(opcional\\)'[\\s\\S]*id: 'payback', title: 'Investimento e payback'[\\s\\S]*id: 'result', title: 'Resultado'/", "/id: 'kit', title: 'Kit de referência \\(opcional\\)'[\\s\\S]*id: 'payback', title: 'Preço e payback'[\\s\\S]*id: 'result', title: 'Resultado'/")
replace_once(
    'tests/payback-flow.test.ts',
    """  assert.match(payback, /label="Margem de lucro"/);
  assert.match(payback, /default_margin_percentage/);
  assert.match(payback, /Configurações da Conta > Preferências Comerciais/);""",
    """  assert.match(payback, /label="Preço da proposta"/);
  assert.match(payback, /Este valor não depende da seleção de um kit/);
  assert.doesNotMatch(payback, /label="Margem de lucro"/);""",
)
replace_once('tests/average-monthly-bill-flow.test.ts', "/typeof form\\.averageMonthlyBillAmount === 'string' && typeof form\\.estimatedSystemCost === 'string'\\) return form/", "/form\\.proposalPrice === proposalPrice[\\s\\S]*form\\.averageMonthlyBillAmount === averageMonthlyBillAmount/")
replace_once(
    'tests/preproposal-optional-technical.test.ts',
    """  assert.match(payback, /Custo estimado preliminar do sistema/);
  assert.match(draft, /estimatedSystemCost\\?: string/);""",
    """  assert.match(payback, /Preço da proposta/);
  assert.match(payback, /não depende da seleção de um kit/);
  assert.match(draft, /proposalPrice\\?: string/);
  assert.match(draft, /estimatedSystemCost\\?: string/);""",
)
replace_once('tests/p2-launch-readiness.test.ts', "  assert.match(payback, /Custo estimado preliminar do sistema/);", "  assert.match(payback, /Preço da proposta/);")

marker.write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preço comercial é independente do kit e o kit fica como referência', async () => {
  const [payback, engine, calculator, draft] = await Promise.all([
    readFile('src/pages/propostas/PaybackStep.tsx', 'utf8'),
    readFile('src/lib/calculations/payback.ts', 'utf8'),
    readFile('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', 'utf8'),
    readFile('src/types/proposalDraft.ts', 'utf8'),
  ]);

  assert.match(payback, /label="Preço da proposta"/);
  assert.match(payback, /Este valor não depende da seleção de um kit/);
  assert.match(payback, /kitCost: selectedKit\\?\\.cost_price \\?\\? null/);
  assert.doesNotMatch(payback, /label="Margem de lucro"/);
  assert.match(engine, /proposalPrice: number/);
  assert.match(engine, /const totalInvestment = input\\.proposalPrice/);
  assert.match(engine, /hasCostBasis/);
  assert.match(calculator, /Preço e payback/);
  assert.match(calculator, /final_price: proposalPrice/);
  assert.match(draft, /proposalPrice\\?: string/);
});
""")

print('Preço direto da proposta aplicado.')
