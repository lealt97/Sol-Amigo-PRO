from pathlib import Path

repo = Path('.')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Trecho esperado não encontrado em {label}:\n{old}')
    return text.replace(old, new, 1)


(repo / 'src/lib/calculations/electricalStandards.ts').write_text("""import type { ConnectionType } from './professionalSizing';

export type ElectricalStandardId =
  | 'monophase_127'
  | 'monophase_220'
  | 'biphase_127_220'
  | 'biphase_220_380'
  | 'triphase_127_220'
  | 'triphase_220_380';

export type ElectricalStandard = Readonly<{
  id: ElectricalStandardId;
  label: string;
  connectionType: ConnectionType;
  availableVoltagesV: readonly number[];
  referenceVoltageV: number;
}>;

export const ELECTRICAL_STANDARD_OPTIONS: readonly ElectricalStandard[] = [
  {
    id: 'monophase_127',
    label: 'Monofásico — 127 V',
    connectionType: 'monophase',
    availableVoltagesV: [127],
    referenceVoltageV: 127,
  },
  {
    id: 'monophase_220',
    label: 'Monofásico — 220 V',
    connectionType: 'monophase',
    availableVoltagesV: [220],
    referenceVoltageV: 220,
  },
  {
    id: 'biphase_127_220',
    label: 'Bifásico — 127/220 V',
    connectionType: 'biphase',
    availableVoltagesV: [127, 220],
    referenceVoltageV: 220,
  },
  {
    id: 'biphase_220_380',
    label: 'Bifásico — 220/380 V',
    connectionType: 'biphase',
    availableVoltagesV: [220, 380],
    referenceVoltageV: 380,
  },
  {
    id: 'triphase_127_220',
    label: 'Trifásico — 127/220 V',
    connectionType: 'triphase',
    availableVoltagesV: [127, 220],
    referenceVoltageV: 220,
  },
  {
    id: 'triphase_220_380',
    label: 'Trifásico — 220/380 V',
    connectionType: 'triphase',
    availableVoltagesV: [220, 380],
    referenceVoltageV: 380,
  },
] as const;

const ELECTRICAL_STANDARD_BY_ID = new Map(
  ELECTRICAL_STANDARD_OPTIONS.map((standard) => [standard.id, standard]),
);

export function getElectricalStandard(id: ElectricalStandardId): ElectricalStandard {
  return ELECTRICAL_STANDARD_BY_ID.get(id) ?? ELECTRICAL_STANDARD_OPTIONS[0];
}

export function inferElectricalStandardId(
  connectionType: ConnectionType,
  legacyVoltageV: number | null,
): ElectricalStandardId {
  if (connectionType === 'monophase') {
    return legacyVoltageV != null && legacyVoltageV >= 180
      ? 'monophase_220'
      : 'monophase_127';
  }

  const highVoltageFamily = legacyVoltageV == null
    ? connectionType === 'triphase'
    : legacyVoltageV >= 300;

  if (connectionType === 'biphase') {
    return highVoltageFamily ? 'biphase_220_380' : 'biphase_127_220';
  }

  return highVoltageFamily ? 'triphase_220_380' : 'triphase_127_220';
}

export function formatElectricalStandardVoltages(voltagesV: readonly number[]) {
  return `${voltagesV.join('/')} V`;
}
""", encoding='utf-8')

(repo / 'src/lib/calculations/electricalCompatibility.ts').write_text("""import type { ConnectionType } from './professionalSizing';
import type { SolarKitConnectionType } from '../../types/solarKit';
import { formatElectricalStandardVoltages } from './electricalStandards';

export type ElectricalCompatibilityStatus =
  | 'compatible'
  | 'connection_upgrade_required'
  | 'technical_review'
  | 'unknown';

export type ElectricalCompatibilityInput = {
  customerConnectionType: ConnectionType;
  customerVoltagesV: readonly number[];
  kitConnectionType: SolarKitConnectionType | null;
  kitVoltageV: number | null;
};

export type ElectricalCompatibilityResult = {
  status: ElectricalCompatibilityStatus;
  statusLabel: string;
  guidance: string;
  requiresConnectionUpgrade: boolean;
  voltageDifferencePercent: number | null;
};

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  monophase: 'monofásica',
  biphase: 'bifásica',
  triphase: 'trifásica',
};

const CONNECTION_RANK: Record<ConnectionType, number> = {
  monophase: 1,
  biphase: 2,
  triphase: 3,
};

export const NOMINAL_VOLTAGE_TOLERANCE_PERCENT = 5;

const validVoltage = (value: number | null) => (
  value != null && Number.isFinite(value) && value > 0
);

const validVoltages = (values: readonly number[]) => (
  values.filter((value) => Number.isFinite(value) && value > 0)
);

export function calculateElectricalCompatibility(
  input: ElectricalCompatibilityInput,
): ElectricalCompatibilityResult {
  const customerVoltagesV = validVoltages(input.customerVoltagesV);

  if (!input.kitConnectionType || !validVoltage(input.kitVoltageV) || customerVoltagesV.length === 0) {
    return {
      status: 'unknown',
      statusLabel: 'Dados elétricos incompletos',
      guidance: 'Cadastre a ligação e a tensão nominal do kit e selecione o padrão elétrico da unidade para concluir a análise.',
      requiresConnectionUpgrade: false,
      voltageDifferencePercent: null,
    };
  }

  const kitVoltageV = input.kitVoltageV as number;
  const voltageDifferences = customerVoltagesV.map((customerVoltageV) => (
    Math.abs(kitVoltageV - customerVoltageV) / customerVoltageV * 100
  ));
  const voltageDifferencePercent = Math.min(...voltageDifferences);
  const voltageCompatible = voltageDifferencePercent <= NOMINAL_VOLTAGE_TOLERANCE_PERCENT;
  const customerRank = CONNECTION_RANK[input.customerConnectionType];
  const kitRank = CONNECTION_RANK[input.kitConnectionType];
  const customerLabel = CONNECTION_LABELS[input.customerConnectionType];
  const kitLabel = CONNECTION_LABELS[input.kitConnectionType];
  const customerVoltagesLabel = formatElectricalStandardVoltages(customerVoltagesV);

  if (kitRank > customerRank) {
    return {
      status: 'connection_upgrade_required',
      statusLabel: 'Aumento de carga necessário',
      guidance: `O kit foi configurado para ligação ${kitLabel} em ${kitVoltageV} V, enquanto a unidade possui padrão ${customerLabel} com ${customerVoltagesLabel}. Antes da aquisição, avalie com a distribuidora o aumento de carga e a alteração do padrão de entrada para ${kitLabel}.`,
      requiresConnectionUpgrade: true,
      voltageDifferencePercent,
    };
  }

  if (!voltageCompatible) {
    return {
      status: 'technical_review',
      statusLabel: 'Análise técnica necessária',
      guidance: `A tensão nominal cadastrada para o kit é ${kitVoltageV} V e o padrão da unidade disponibiliza ${customerVoltagesLabel}. Isso não significa automaticamente que a rede precise ser adequada: confirme apenas a versão correta do inversor, a tensão de conexão e as regras da distribuidora.`,
      requiresConnectionUpgrade: false,
      voltageDifferencePercent,
    };
  }

  if (kitRank < customerRank) {
    return {
      status: 'technical_review',
      statusLabel: 'Análise técnica necessária',
      guidance: `A unidade possui ligação ${customerLabel}, enquanto o kit foi configurado para ligação ${kitLabel}. A instalação pode ser possível, mas deve ser confirmada quanto ao balanceamento de fases, limite de potência por fase e regras da distribuidora.`,
      requiresConnectionUpgrade: false,
      voltageDifferencePercent,
    };
  }

  return {
    status: 'compatible',
    statusLabel: 'Compatibilidade elétrica confirmada',
    guidance: `A ligação ${kitLabel} e a tensão nominal de ${kitVoltageV} V do kit são atendidas pelo padrão elétrico ${customerLabel} de ${customerVoltagesLabel}.`,
    requiresConnectionUpgrade: false,
    voltageDifferencePercent,
  };
}
""", encoding='utf-8')

proposal_draft_path = repo / 'src/types/proposalDraft.ts'
proposal_draft = proposal_draft_path.read_text(encoding='utf-8')
if "import type { ElectricalStandardId }" not in proposal_draft:
    proposal_draft = "import type { ElectricalStandardId } from '../lib/calculations/electricalStandards';\n\n" + proposal_draft
proposal_draft = replace_once(
    proposal_draft,
    "  connectionType: ProposalDraftConnectionType;\n  gridVoltageV?: string;",
    "  connectionType: ProposalDraftConnectionType;\n  gridVoltageV?: string;\n  electricalStandardId?: ElectricalStandardId;",
    'estado do rascunho',
) if 'electricalStandardId?: ElectricalStandardId;' not in proposal_draft else proposal_draft
proposal_draft_path.write_text(proposal_draft, encoding='utf-8')

calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')

if "from '../../lib/calculations/electricalStandards'" not in calculator:
    calculator = replace_once(
        calculator,
        "import { calculateElectricalCompatibility } from '../../lib/calculations/electricalCompatibility';\n",
        "import { calculateElectricalCompatibility } from '../../lib/calculations/electricalCompatibility';\nimport {\n  ELECTRICAL_STANDARD_OPTIONS,\n  getElectricalStandard,\n  inferElectricalStandardId,\n  type ElectricalStandardId,\n} from '../../lib/calculations/electricalStandards';\n",
        'imports do padrão elétrico',
    )

calculator = replace_once(
    calculator,
    "  const [loadSurvey, setLoadSurvey] = useState<LoadSurveyDraft[]>([createLoadDraft()]);\n  const [connectionType, setConnectionType] = useState<ConnectionType>('monophase');\n  const [gridVoltageV, setGridVoltageV] = useState('');\n",
    "  const [loadSurvey, setLoadSurvey] = useState<LoadSurveyDraft[]>([createLoadDraft()]);\n  const [electricalStandardId, setElectricalStandardId] = useState<ElectricalStandardId>('monophase_127');\n",
    'estado do padrão elétrico',
)

calculator = replace_once(
    calculator,
    "  const [paybackForm, setPaybackForm] = useState<ProposalDraftPaybackForm | null>(null);\n  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);\n\n  function hydrateProposalDraft",
    "  const [paybackForm, setPaybackForm] = useState<ProposalDraftPaybackForm | null>(null);\n  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);\n\n  const selectedElectricalStandard = getElectricalStandard(electricalStandardId);\n  const connectionType = selectedElectricalStandard.connectionType;\n  const gridVoltageV = String(selectedElectricalStandard.referenceVoltageV);\n\n  function hydrateProposalDraft",
    'derivação do padrão elétrico',
)

calculator = replace_once(
    calculator,
    "    setLoadSurvey(state.loadSurvey.length > 0 ? state.loadSurvey : [createLoadDraft()]);\n    setConnectionType(state.connectionType as ConnectionType);\n    setGridVoltageV(state.gridVoltageV || '');\n    setHspDaily(state.hspDaily);",
    "    setLoadSurvey(state.loadSurvey.length > 0 ? state.loadSurvey : [createLoadDraft()]);\n    setElectricalStandardId(\n      state.electricalStandardId\n        ?? inferElectricalStandardId(\n          state.connectionType as ConnectionType,\n          parseOptionalNumber(state.gridVoltageV || ''),\n        ),\n    );\n    setHspDaily(state.hspDaily);",
    'hidratação do padrão elétrico',
)

calculator = replace_once(
    calculator,
    "    return calculateElectricalCompatibility({\n      customerConnectionType: connectionType,\n      customerVoltageV: parseOptionalNumber(gridVoltageV),\n      kitConnectionType: selectedKit.grid_connection_type ?? null,\n      kitVoltageV: selectedKit.grid_voltage_v ?? null,\n    });\n  }, [connectionType, gridVoltageV, selectedKit]);",
    "    return calculateElectricalCompatibility({\n      customerConnectionType: connectionType,\n      customerVoltagesV: selectedElectricalStandard.availableVoltagesV,\n      kitConnectionType: selectedKit.grid_connection_type ?? null,\n      kitVoltageV: selectedKit.grid_voltage_v ?? null,\n    });\n  }, [connectionType, selectedElectricalStandard, selectedKit]);",
    'compatibilidade elétrica da unidade',
)

calculator = replace_once(
    calculator,
    "\n      const parsedGridVoltage = parseNumber(gridVoltageV);\n      if (!Number.isFinite(parsedGridVoltage) || parsedGridVoltage <= 0) {\n        toast.error('Informe a tensão da unidade consumidora em volts.');\n        return false;\n      }\n",
    "",
    'validação antiga de tensão',
)

calculator = replace_once(
    calculator,
    "    connectionType,\n    gridVoltageV,\n    hspDaily,",
    "    connectionType,\n    gridVoltageV,\n    electricalStandardId,\n    hspDaily,",
    'persistência do padrão elétrico',
)

old_ui = """                <div className=\"grid max-w-3xl gap-4 md:grid-cols-2\">\n                  <label className=\"space-y-2\">\n                    <span className=\"text-sm font-semibold text-brand-dark\">Tipo de ligação</span>\n                    <Select value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}>\n                      <option value=\"monophase\">Monofásica — 30 kWh</option>\n                      <option value=\"biphase\">Bifásica — 50 kWh</option>\n                      <option value=\"triphase\">Trifásica — 100 kWh</option>\n                    </Select>\n                    <p className=\"text-xs leading-5 text-slate-500\">\n                      O sistema subtrai automaticamente o custo de disponibilidade da média mensal obtida no modo escolhido.\n                    </p>\n                  </label>\n                  <Field\n                    label=\"Tensão da unidade consumidora\"\n                    value={gridVoltageV}\n                    onChange={setGridVoltageV}\n                    suffix=\"V\"\n                    min={1}\n                    step=\"1\"\n                    helper=\"Use a tensão nominal informada na conta ou no padrão de entrada, como 127, 220 ou 380 V.\"\n                  />\n                </div>\n"""
new_ui = """                <label className=\"block max-w-xl space-y-2\">\n                  <span className=\"text-sm font-semibold text-brand-dark\">Padrão elétrico da unidade</span>\n                  <Select\n                    value={electricalStandardId}\n                    onChange={(event) => setElectricalStandardId(event.target.value as ElectricalStandardId)}\n                  >\n                    {ELECTRICAL_STANDARD_OPTIONS.map((standard) => (\n                      <option key={standard.id} value={standard.id}>{standard.label}</option>\n                    ))}\n                  </Select>\n                  <p className=\"text-xs leading-5 text-slate-500\">\n                    O tipo de ligação define o custo de disponibilidade de {CONNECTION_AVAILABILITY_KWH[connectionType]} kWh. As tensões do padrão são usadas somente para conferir a compatibilidade do inversor.\n                  </p>\n                </label>\n"""
calculator = replace_once(calculator, old_ui, new_ui, 'campo unificado do padrão elétrico')

calculator = calculator.replace(
    "                            : selectedKitElectricalCompatibility.status === 'voltage_adaptation_required'\n                              ? 'border-red-400/50 bg-red-500/10'\n                              : selectedKitElectricalCompatibility.status === 'technical_review'\n                                ? 'border-brand-light/40 bg-brand-blue/10'\n                                : 'border-slate-400/40 bg-slate-500/10'",
    "                            : selectedKitElectricalCompatibility.status === 'technical_review'\n                              ? 'border-brand-light/40 bg-brand-blue/10'\n                              : 'border-slate-400/40 bg-slate-500/10'",
)
calculator = calculator.replace(
    "                            <AlertTriangle className={`mt-0.5 h-6 w-6 shrink-0 ${selectedKitElectricalCompatibility.status === 'voltage_adaptation_required' ? 'text-red-300' : 'text-amber-300'}`} />",
    "                            <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0 text-amber-300\" />",
)
calculator_path.write_text(calculator, encoding='utf-8')

(repo / 'tests/electrical-compatibility.test.ts').write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateElectricalCompatibility } from '../src/lib/calculations/electricalCompatibility';
import {
  ELECTRICAL_STANDARD_OPTIONS,
  getElectricalStandard,
  inferElectricalStandardId,
} from '../src/lib/calculations/electricalStandards';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('expõe os seis padrões elétricos definidos para a unidade', () => {
  assert.deepEqual(
    ELECTRICAL_STANDARD_OPTIONS.map((standard) => standard.label),
    [
      'Monofásico — 127 V',
      'Monofásico — 220 V',
      'Bifásico — 127/220 V',
      'Bifásico — 220/380 V',
      'Trifásico — 127/220 V',
      'Trifásico — 220/380 V',
    ],
  );
});

test('confirma kit de 220 V em padrão bifásico 127/220 V', () => {
  const standard = getElectricalStandard('biphase_127_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'biphase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'compatible');
  assert.equal(result.requiresConnectionUpgrade, false);
});

test('confirma kit de 380 V em padrão trifásico 220/380 V', () => {
  const standard = getElectricalStandard('triphase_220_380');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'compatible');
});

test('indica aumento de carga quando o kit exige mais fases', () => {
  const standard = getElectricalStandard('monophase_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'connection_upgrade_required');
  assert.equal(result.requiresConnectionUpgrade, true);
  assert.match(result.guidance, /aumento de carga/i);
});

test('aceita pequena diferença entre tensões nominais', () => {
  const standard = getElectricalStandard('monophase_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'monophase',
    kitVoltageV: 230,
  });

  assert.equal(result.status, 'compatible');
});

test('trata tensão fora do padrão apenas como análise técnica', () => {
  const standard = getElectricalStandard('triphase_127_220');
  const result = calculateElectricalCompatibility({
    customerConnectionType: standard.connectionType,
    customerVoltagesV: standard.availableVoltagesV,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'technical_review');
  assert.match(result.guidance, /não significa automaticamente/i);
});

test('converte os dados antigos do rascunho para o padrão unificado', () => {
  assert.equal(inferElectricalStandardId('monophase', 220), 'monophase_220');
  assert.equal(inferElectricalStandardId('biphase', 220), 'biphase_127_220');
  assert.equal(inferElectricalStandardId('triphase', 380), 'triphase_220_380');
});

test('catálogo mantém dados do kit e proposta usa um único campo da unidade', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Ligação atendida \*/);
  assert.match(catalog, /Tensão nominal V \*/);
  assert.match(calculator, /Padrão elétrico da unidade/);
  assert.doesNotMatch(calculator, /label=\"Tensão da unidade consumidora\"/);
  assert.match(calculator, /Compatibilidade elétrica/);
  assert.match(calculator, /A relação está acima da referência de 1,20[\s\S]*não bloqueia a compatibilidade do kit/);
});
""", encoding='utf-8')

print('Padrão elétrico unificado aplicado.')
