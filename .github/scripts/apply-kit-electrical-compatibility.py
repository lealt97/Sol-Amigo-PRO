from pathlib import Path

repo = Path('.')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Trecho esperado não encontrado em {label}:\n{old}')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# Tipos do kit e snapshot
# -----------------------------------------------------------------------------
types_path = repo / 'src/types/solarKit.ts'
types = types_path.read_text(encoding='utf-8')

if 'export type SolarKitConnectionType' not in types:
    types = replace_once(
        types,
        "export const SOLAR_SYSTEM_TYPE_LABELS: Record<SolarSystemType, string> = {\n  on_grid: 'On-grid',\n  hybrid: 'Híbrido',\n  off_grid: 'Off-grid',\n};\n",
        "export const SOLAR_SYSTEM_TYPE_LABELS: Record<SolarSystemType, string> = {\n  on_grid: 'On-grid',\n  hybrid: 'Híbrido',\n  off_grid: 'Off-grid',\n};\n\nexport type SolarKitConnectionType = 'monophase' | 'biphase' | 'triphase';\n\nexport const SOLAR_KIT_CONNECTION_TYPE_LABELS: Record<SolarKitConnectionType, string> = {\n  monophase: 'Monofásica',\n  biphase: 'Bifásica',\n  triphase: 'Trifásica',\n};\n",
        'tipos de ligação do kit',
    )

for old, new, label in [
    (
        '  inverter_power_kw: number | null;\n  structure_type: string | null;',
        '  inverter_power_kw: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;\n  grid_voltage_v?: number | null;\n  structure_type: string | null;',
        'interface SolarKit',
    ),
    (
        '  inverter_power_kw?: number | null;\n  structure_type?: string | null;',
        '  inverter_power_kw?: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;\n  grid_voltage_v?: number | null;\n  structure_type?: string | null;',
        'formulário SolarKit',
    ),
    (
        '  inverter_power_kw: number | null;\n  structure_type: string | null;',
        '  inverter_power_kw: number | null;\n  grid_connection_type: SolarKitConnectionType | null;\n  grid_voltage_v: number | null;\n  structure_type: string | null;',
        'snapshot SolarKit',
    ),
]:
    if new not in types:
        types = replace_once(types, old, new, label)

if 'grid_connection_type: kit.grid_connection_type ?? null' not in types:
    types = replace_once(
        types,
        '    inverter_power_kw: kit.inverter_power_kw,\n    structure_type: kit.structure_type,',
        '    inverter_power_kw: kit.inverter_power_kw,\n    grid_connection_type: kit.grid_connection_type ?? null,\n    grid_voltage_v: kit.grid_voltage_v ?? null,\n    structure_type: kit.structure_type,',
        'construção do snapshot',
    )

types_path.write_text(types, encoding='utf-8')


# -----------------------------------------------------------------------------
# Normalização e operações do catálogo
# -----------------------------------------------------------------------------
operations_path = repo / 'src/lib/kits/solarKitOperations.ts'
operations = operations_path.read_text(encoding='utf-8')

if 'SolarKitConnectionType,' not in operations:
    operations = replace_once(
        operations,
        '  SolarKitFormValues,\n  SolarSystemType,',
        '  SolarKitConnectionType,\n  SolarKitFormValues,\n  SolarSystemType,',
        'importação de SolarKitConnectionType',
    )

if 'grid_connection_type: SolarKitConnectionType | null;' not in operations:
    operations = replace_once(
        operations,
        '  inverter_power_kw: number | null;\n  structure_type: string | null;',
        '  inverter_power_kw: number | null;\n  grid_connection_type: SolarKitConnectionType | null;\n  grid_voltage_v: number | null;\n  structure_type: string | null;',
        'payload normalizado',
    )

if 'normalizeSolarKitConnectionType' not in operations:
    operations = replace_once(
        operations,
        "export function normalizeSolarSystemType(\n  value?: SolarSystemType | string | null,\n): SolarSystemType {\n  if (value === 'hybrid' || value === 'off_grid') return value;\n  return 'on_grid';\n}\n",
        "export function normalizeSolarSystemType(\n  value?: SolarSystemType | string | null,\n): SolarSystemType {\n  if (value === 'hybrid' || value === 'off_grid') return value;\n  return 'on_grid';\n}\n\nexport function normalizeSolarKitConnectionType(\n  value?: SolarKitConnectionType | string | null,\n): SolarKitConnectionType | null {\n  if (value === 'monophase' || value === 'biphase' || value === 'triphase') return value;\n  return null;\n}\n",
        'normalização da ligação do kit',
    )

if 'grid_connection_type: normalizeSolarKitConnectionType' not in operations:
    operations = replace_once(
        operations,
        '    inverter_power_kw: normalizeOptionalNumber(kit.inverter_power_kw),\n    structure_type: normalizeText(kit.structure_type),',
        '    inverter_power_kw: normalizeOptionalNumber(kit.inverter_power_kw),\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),\n    grid_voltage_v: normalizeOptionalNumber(kit.grid_voltage_v),\n    structure_type: normalizeText(kit.structure_type),',
        'normalização elétrica do payload',
    )

if 'grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type)' not in operations.split('export function solarKitToFormValues', 1)[1]:
    operations = replace_once(
        operations,
        '    inverter_power_kw: kit.inverter_power_kw,\n    structure_type: kit.structure_type,',
        '    inverter_power_kw: kit.inverter_power_kw,\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),\n    grid_voltage_v: kit.grid_voltage_v ?? null,\n    structure_type: kit.structure_type,',
        'conversão do kit para formulário',
    )

if 'kit.grid_connection_type,' not in operations:
    operations = replace_once(
        operations,
        '      kit.inverter_model,\n      kit.battery_brand,',
        '      kit.inverter_model,\n      kit.grid_connection_type,\n      kit.grid_voltage_v,\n      kit.battery_brand,',
        'filtro dos campos elétricos',
    )

operations_path.write_text(operations, encoding='utf-8')


# -----------------------------------------------------------------------------
# Formulário e listagem do catálogo
# -----------------------------------------------------------------------------
catalog_path = repo / 'src/pages/kits/SolarKitCatalog.tsx'
catalog = catalog_path.read_text(encoding='utf-8')

catalog = catalog.replace(
    "import { SOLAR_SYSTEM_TYPE_LABELS, SolarKit, SolarKitFormValues, SolarSystemType } from '../../types/solarKit';",
    "import {\n  SOLAR_KIT_CONNECTION_TYPE_LABELS,\n  SOLAR_SYSTEM_TYPE_LABELS,\n  SolarKit,\n  SolarKitConnectionType,\n  SolarKitFormValues,\n  SolarSystemType,\n} from '../../types/solarKit';",
)

if 'grid_connection_type: SolarKitConnectionType |' not in catalog:
    catalog = replace_once(
        catalog,
        '  inverter_power_kw: string;\n  structure_type: string;',
        "  inverter_power_kw: string;\n  grid_connection_type: SolarKitConnectionType | '';\n  grid_voltage_v: string;\n  structure_type: string;",
        'estado do formulário elétrico',
    )

if "grid_connection_type: ''," not in catalog:
    catalog = replace_once(
        catalog,
        "  inverter_power_kw: '',\n  structure_type: '',",
        "  inverter_power_kw: '',\n  grid_connection_type: '',\n  grid_voltage_v: '',\n  structure_type: '',",
        'valores vazios elétricos',
    )

if 'grid_connection_type: kit.grid_connection_type ||' not in catalog:
    catalog = replace_once(
        catalog,
        "  inverter_power_kw: kit.inverter_power_kw ? String(kit.inverter_power_kw) : '',\n  structure_type: kit.structure_type || '',",
        "  inverter_power_kw: kit.inverter_power_kw ? String(kit.inverter_power_kw) : '',\n  grid_connection_type: kit.grid_connection_type || '',\n  grid_voltage_v: kit.grid_voltage_v ? String(kit.grid_voltage_v) : '',\n  structure_type: kit.structure_type || '',",
        'edição dos dados elétricos',
    )

if 'grid_connection_type: form.grid_connection_type || null' not in catalog:
    catalog = replace_once(
        catalog,
        '  inverter_power_kw: parseOptionalNumber(form.inverter_power_kw),\n  structure_type: form.structure_type || null,',
        '  inverter_power_kw: parseOptionalNumber(form.inverter_power_kw),\n  grid_connection_type: form.grid_connection_type || null,\n  grid_voltage_v: parseOptionalNumber(form.grid_voltage_v),\n  structure_type: form.structure_type || null,',
        'payload dos dados elétricos',
    )

if 'SOLAR_KIT_CONNECTION_TYPE_LABELS[kit.grid_connection_type]' not in catalog:
    catalog = replace_once(
        catalog,
        '        kit.inverter_model,\n        kit.battery_brand,',
        "        kit.inverter_model,\n        kit.grid_connection_type ? SOLAR_KIT_CONNECTION_TYPE_LABELS[kit.grid_connection_type] : null,\n        kit.grid_voltage_v ? `${kit.grid_voltage_v} V` : null,\n        kit.battery_brand,",
        'busca dos dados elétricos',
    )

if "Informe o tipo de ligação atendida pelo kit." not in catalog:
    catalog = replace_once(
        catalog,
        "    if (parseNumber(form.module_quantity) <= 0) return 'Informe a quantidade de módulos.';\n    if (hasStorage",
        "    if (parseNumber(form.module_quantity) <= 0) return 'Informe a quantidade de módulos.';\n    if (!form.grid_connection_type) return 'Informe o tipo de ligação atendida pelo kit.';\n    if ((parseOptionalNumber(form.grid_voltage_v) ?? 0) <= 0) return 'Informe a tensão nominal do kit em volts.';\n    if (hasStorage",
        'validação elétrica do catálogo',
    )

old_inverter_form = '''              <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                <h3 className="mb-4 text-sm font-semibold text-brand-dark">Inversor</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Marca</label><Input value={form.inverter_brand} onChange={(event) => updateField('inverter_brand', event.target.value)} placeholder="Ex: Deye" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Modelo</label><Input value={form.inverter_model} onChange={(event) => updateField('inverter_model', event.target.value)} placeholder="Ex: SUN-5K-SG04LP1" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Potência kW</label><Input type="number" min="0" step="0.01" value={form.inverter_power_kw} onChange={(event) => updateField('inverter_power_kw', event.target.value)} placeholder="5" /></div>
                </div>
              </div>'''
new_inverter_form = '''              <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                <h3 className="mb-1 text-sm font-semibold text-brand-dark">Inversor e conexão elétrica</h3>
                <p className="mb-4 text-xs leading-5 text-slate-500">Cadastre a configuração para a qual o conjunto foi montado pelo fornecedor.</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Marca</label><Input value={form.inverter_brand} onChange={(event) => updateField('inverter_brand', event.target.value)} placeholder="Ex: Deye" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Modelo</label><Input value={form.inverter_model} onChange={(event) => updateField('inverter_model', event.target.value)} placeholder="Ex: SUN-5K-SG04LP1" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Potência kW</label><Input type="number" min="0" step="0.01" value={form.inverter_power_kw} onChange={(event) => updateField('inverter_power_kw', event.target.value)} placeholder="5" /></div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Ligação atendida *</label>
                    <select value={form.grid_connection_type} onChange={(event) => updateField('grid_connection_type', event.target.value as SolarKitConnectionType)} className="flex h-10 w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2">
                      <option value="">Selecione</option>
                      <option value="monophase">Monofásica</option>
                      <option value="biphase">Bifásica</option>
                      <option value="triphase">Trifásica</option>
                    </select>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Tensão nominal V *</label><Input type="number" min="1" step="1" value={form.grid_voltage_v} onChange={(event) => updateField('grid_voltage_v', event.target.value)} placeholder="Ex: 220" /></div>
                </div>
              </div>'''
if new_inverter_form not in catalog:
    catalog = replace_once(catalog, old_inverter_form, new_inverter_form, 'formulário do inversor')

if '<th className="px-4 py-3 font-medium">Elétrica</th>' not in catalog:
    catalog = replace_once(
        catalog,
        '                <th className="px-4 py-3 font-medium">Potência</th>\n                <th className="px-4 py-3 font-medium">Bateria/Backup</th>',
        '                <th className="px-4 py-3 font-medium">Potência</th>\n                <th className="px-4 py-3 font-medium">Elétrica</th>\n                <th className="px-4 py-3 font-medium">Bateria/Backup</th>',
        'cabeçalho elétrico da tabela',
    )
    catalog = catalog.replace('colSpan={7}', 'colSpan={8}')

if 'Ligação não informada' not in catalog:
    catalog = replace_once(
        catalog,
        '                    <td className="px-4 py-3 text-brand-dark"><div className="font-semibold">{Number(kit.kit_power_kwp || 0).toFixed(2)} kWp</div><div className="text-[11px] text-slate-500">{kit.module_quantity} × {kit.module_power_w} W</div></td>\n                    <td className="px-4 py-3 text-brand-dark">',
        '''                    <td className="px-4 py-3 text-brand-dark"><div className="font-semibold">{Number(kit.kit_power_kwp || 0).toFixed(2)} kWp</div><div className="text-[11px] text-slate-500">{kit.module_quantity} × {kit.module_power_w} W</div></td>
                    <td className="px-4 py-3 text-brand-dark">
                      <div className="font-semibold">{kit.grid_connection_type ? SOLAR_KIT_CONNECTION_TYPE_LABELS[kit.grid_connection_type] : 'Ligação não informada'}</div>
                      <div className="text-[11px] text-slate-500">{kit.grid_voltage_v ? `${kit.grid_voltage_v} V` : 'Tensão não informada'}</div>
                    </td>
                    <td className="px-4 py-3 text-brand-dark">''',
        'dados elétricos da tabela',
    )

catalog = catalog.replace(
    'placeholder="Buscar por kit, fornecedor, módulo, inversor ou bateria..."',
    'placeholder="Buscar por kit, fornecedor, módulo, inversor, ligação, tensão ou bateria..."',
)

catalog_path.write_text(catalog, encoding='utf-8')


# -----------------------------------------------------------------------------
# Estado do rascunho da proposta
# -----------------------------------------------------------------------------
draft_path = repo / 'src/types/proposalDraft.ts'
draft = draft_path.read_text(encoding='utf-8')
if 'gridVoltageV?: string;' not in draft:
    draft = replace_once(
        draft,
        '  connectionType: ProposalDraftConnectionType;\n  hspDaily: string;',
        '  connectionType: ProposalDraftConnectionType;\n  gridVoltageV?: string;\n  hspDaily: string;',
        'tensão no rascunho',
    )
draft_path.write_text(draft, encoding='utf-8')


# -----------------------------------------------------------------------------
# Motor de compatibilidade elétrica
# -----------------------------------------------------------------------------
compatibility_path = repo / 'src/lib/calculations/electricalCompatibility.ts'
compatibility_path.write_text("""import type { ConnectionType } from './professionalSizing';
import type { SolarKitConnectionType } from '../../types/solarKit';

export type ElectricalCompatibilityStatus =
  | 'compatible'
  | 'connection_upgrade_required'
  | 'voltage_adaptation_required'
  | 'technical_review'
  | 'unknown';

export type ElectricalCompatibilityInput = {
  customerConnectionType: ConnectionType;
  customerVoltageV: number | null;
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

export function calculateElectricalCompatibility(
  input: ElectricalCompatibilityInput,
): ElectricalCompatibilityResult {
  if (!input.kitConnectionType || !validVoltage(input.kitVoltageV) || !validVoltage(input.customerVoltageV)) {
    return {
      status: 'unknown',
      statusLabel: 'Dados elétricos incompletos',
      guidance: 'Cadastre a ligação e a tensão nominal do kit e informe a tensão da unidade consumidora para concluir a análise.',
      requiresConnectionUpgrade: false,
      voltageDifferencePercent: null,
    };
  }

  const customerVoltageV = input.customerVoltageV as number;
  const kitVoltageV = input.kitVoltageV as number;
  const voltageDifferencePercent = Math.abs(kitVoltageV - customerVoltageV) / customerVoltageV * 100;
  const voltageCompatible = voltageDifferencePercent <= NOMINAL_VOLTAGE_TOLERANCE_PERCENT;
  const customerRank = CONNECTION_RANK[input.customerConnectionType];
  const kitRank = CONNECTION_RANK[input.kitConnectionType];
  const customerLabel = CONNECTION_LABELS[input.customerConnectionType];
  const kitLabel = CONNECTION_LABELS[input.kitConnectionType];

  if (kitRank > customerRank) {
    return {
      status: 'connection_upgrade_required',
      statusLabel: 'Aumento de carga necessário',
      guidance: `O kit foi configurado para ligação ${kitLabel} em ${kitVoltageV} V, enquanto a unidade está em ligação ${customerLabel} de ${customerVoltageV} V. Antes da aquisição, avalie com a distribuidora o aumento de carga e a alteração do padrão de entrada para ${kitLabel}.`,
      requiresConnectionUpgrade: true,
      voltageDifferencePercent,
    };
  }

  if (!voltageCompatible) {
    return {
      status: 'voltage_adaptation_required',
      statusLabel: 'Adequação de tensão necessária',
      guidance: `A tensão nominal do kit é ${kitVoltageV} V e a unidade foi informada com ${customerVoltageV} V. Selecione uma versão compatível do kit ou confirme a adequação elétrica com o projetista e a distribuidora.`,
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
    guidance: `A ligação ${kitLabel} e a tensão nominal de ${kitVoltageV} V do kit correspondem aos dados informados para a unidade consumidora.`,
    requiresConnectionUpgrade: false,
    voltageDifferencePercent,
  };
}
""", encoding='utf-8')


# -----------------------------------------------------------------------------
# Calculadora profissional
# -----------------------------------------------------------------------------
view_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
view = view_path.read_text(encoding='utf-8')

if "from '../../lib/calculations/electricalCompatibility'" not in view:
    view = replace_once(
        view,
        "import { calculateDcAcOversizing } from '../../lib/calculations/oversizing';",
        "import { calculateDcAcOversizing } from '../../lib/calculations/oversizing';\nimport { calculateElectricalCompatibility } from '../../lib/calculations/electricalCompatibility';",
        'importação da compatibilidade elétrica',
    )

view = view.replace(
    "import { buildSolarKitSnapshot, type SolarKit } from '../../types/solarKit';",
    "import {\n  SOLAR_KIT_CONNECTION_TYPE_LABELS,\n  buildSolarKitSnapshot,\n  type SolarKit,\n} from '../../types/solarKit';",
)

if "const [gridVoltageV, setGridVoltageV]" not in view:
    view = replace_once(
        view,
        "  const [connectionType, setConnectionType] = useState<ConnectionType>('monophase');\n",
        "  const [connectionType, setConnectionType] = useState<ConnectionType>('monophase');\n  const [gridVoltageV, setGridVoltageV] = useState('');\n",
        'estado da tensão da unidade',
    )

if 'setGridVoltageV(state.gridVoltageV ||' not in view:
    view = replace_once(
        view,
        '    setConnectionType(state.connectionType as ConnectionType);\n    setHspDaily(state.hspDaily);',
        "    setConnectionType(state.connectionType as ConnectionType);\n    setGridVoltageV(state.gridVoltageV || '');\n    setHspDaily(state.hspDaily);",
        'hidratação da tensão',
    )

if 'const selectedKitElectricalCompatibility = useMemo' not in view:
    view = replace_once(
        view,
        '  }, [selectedKit]);\n\n  const consumptionModeInput = useMemo(() => ({',
        "  }, [selectedKit]);\n\n  const selectedKitElectricalCompatibility = useMemo(() => {\n    if (!selectedKit) return null;\n\n    return calculateElectricalCompatibility({\n      customerConnectionType: connectionType,\n      customerVoltageV: parseOptionalNumber(gridVoltageV),\n      kitConnectionType: selectedKit.grid_connection_type ?? null,\n      kitVoltageV: selectedKit.grid_voltage_v ?? null,\n    });\n  }, [connectionType, gridVoltageV, selectedKit]);\n\n  const consumptionModeInput = useMemo(() => ({",
        'cálculo da compatibilidade elétrica',
    )

if "Informe a tensão da unidade consumidora" not in view:
    view = replace_once(
        view,
        "      const availability = CONNECTION_AVAILABILITY_KWH[connectionType];\n      if (consumptionResolution.averageMonthlyConsumptionKwh <= availability) {",
        "      const parsedGridVoltage = parseNumber(gridVoltageV);\n      if (!Number.isFinite(parsedGridVoltage) || parsedGridVoltage <= 0) {\n        toast.error('Informe a tensão da unidade consumidora em volts.');\n        return false;\n      }\n\n      const availability = CONNECTION_AVAILABILITY_KWH[connectionType];\n      if (consumptionResolution.averageMonthlyConsumptionKwh <= availability) {",
        'validação da tensão da unidade',
    )

if '    gridVoltageV,\n    hspDaily,' not in view:
    view = replace_once(
        view,
        '    connectionType,\n    hspDaily,',
        '    connectionType,\n    gridVoltageV,\n    hspDaily,',
        'persistência da tensão',
    )

old_connection_field = '''                <label className="block max-w-md space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Tipo de ligação</span>
                  <Select value={connectionType} onChange={(event) => setConnectionType(event.target.value as ConnectionType)}>
                    <option value="monophase">Monofásica — 30 kWh</option>
                    <option value="biphase">Bifásica — 50 kWh</option>
                    <option value="triphase">Trifásica — 100 kWh</option>
                  </Select>
                  <p className="text-xs leading-5 text-slate-500">
                    O sistema subtrai automaticamente o custo de disponibilidade da média mensal obtida no modo escolhido.
                  </p>
                </label>'''
new_connection_field = '''                <div className="grid max-w-3xl gap-4 md:grid-cols-2">
                  <label className="space-y-2">
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
                  <Field
                    label="Tensão da unidade consumidora"
                    value={gridVoltageV}
                    onChange={setGridVoltageV}
                    suffix="V"
                    min={1}
                    step="1"
                    helper="Use a tensão nominal informada na conta ou no padrão de entrada, como 127, 220 ou 380 V."
                  />
                </div>'''
if new_connection_field not in view:
    view = replace_once(view, old_connection_field, new_connection_field, 'campos elétricos da unidade')

# Opções do seletor com identificação elétrica.
old_option = '''                          {kit.name} — {number.format(kit.kit_power_kwp)} kWp'''
new_option = '''                          {kit.name} — {number.format(kit.kit_power_kwp)} kWp{kit.grid_connection_type ? ` — ${SOLAR_KIT_CONNECTION_TYPE_LABELS[kit.grid_connection_type]}` : ''}{kit.grid_voltage_v ? ` ${kit.grid_voltage_v} V` : ''}'''
view = view.replace(old_option, new_option)

if 'Ligação atendida pelo kit' not in view:
    view = replace_once(
        view,
        '''                            <Detail label="Potência AC do inversor" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />''',
        '''                            <Detail label="Potência AC do inversor" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />
                            <Detail label="Ligação atendida pelo kit" value={selectedKit.grid_connection_type ? SOLAR_KIT_CONNECTION_TYPE_LABELS[selectedKit.grid_connection_type] : 'Não informada'} />
                            <Detail label="Tensão nominal do kit" value={selectedKit.grid_voltage_v ? `${number.format(selectedKit.grid_voltage_v)} V` : 'Não informada'} />''',
        'detalhes elétricos do kit',
    )

compatibility_card = '''
                    {selectedKitElectricalCompatibility && (
                      <div className={`rounded-xl border p-5 ${
                        selectedKitElectricalCompatibility.status === 'compatible'
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : selectedKitElectricalCompatibility.status === 'connection_upgrade_required'
                            ? 'border-amber-400/50 bg-amber-500/10'
                            : selectedKitElectricalCompatibility.status === 'voltage_adaptation_required'
                              ? 'border-red-400/50 bg-red-500/10'
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
                            <AlertTriangle className={`mt-0.5 h-6 w-6 shrink-0 ${selectedKitElectricalCompatibility.status === 'voltage_adaptation_required' ? 'text-red-300' : 'text-amber-300'}`} />
                          )}
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-light">Compatibilidade elétrica</p>
                            <h3 className="mt-1 text-lg font-bold text-brand-dark">{selectedKitElectricalCompatibility.statusLabel}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-200">{selectedKitElectricalCompatibility.guidance}</p>
                          </div>
                        </div>
                      </div>
                    )}
'''
if 'Compatibilidade elétrica</p>' not in view:
    marker = '                    {selectedKitOversizing ? ('
    if marker not in view:
        raise SystemExit('Trecho de oversizing não encontrado para inserir compatibilidade elétrica.')
    view = view.replace(marker, compatibility_card + '\n' + marker, 1)

# Oversizing do kit é informativo: acima de 1,20 não é incompatibilidade automática.
view = view.replace(
    "                          : selectedKitOversizing.status === 'above_reference'\n                            ? 'border-amber-400/50 bg-amber-500/10'\n                            : 'border-brand-light/30 bg-brand-blue/10'",
    "                          : 'border-brand-light/30 bg-brand-blue/10'",
)
view = view.replace(
    "                          ) : selectedKitOversizing.status === 'above_reference' ? (\n                            <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0 text-amber-300\" />\n                          ) : (\n                            <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-brand-light\" />\n                          )}",
    "                          ) : (\n                            <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-brand-light\" />\n                          )}",
)
view = view.replace('Oversizing DC/AC</p>', 'Configuração DC/AC do kit</p>')
view = view.replace(
    '<p className="mt-1 text-sm leading-6 text-slate-200">{selectedKitOversizing.guidance}</p>',
    '''<p className="mt-1 text-sm leading-6 text-slate-200">
                              {selectedKitOversizing.status === 'above_reference'
                                ? 'A relação está acima da referência de 1,20, mas faz parte do conjunto cadastrado pelo fornecedor e não bloqueia a compatibilidade do kit. Confirme os limites elétricos e as condições de garantia no datasheet.'
                                : selectedKitOversizing.guidance}
                            </p>''',
)

view_path.write_text(view, encoding='utf-8')


# -----------------------------------------------------------------------------
# Migração e esquema consolidado
# -----------------------------------------------------------------------------
migration_path = repo / 'supabase/migrations/20260724150000_add_solar_kit_electrical_compatibility.sql'
migration_sql = """-- Compatibilidade elétrica dos kits solares
alter table public.solar_kits
  add column if not exists grid_connection_type text
    check (grid_connection_type is null or grid_connection_type in ('monophase', 'biphase', 'triphase')),
  add column if not exists grid_voltage_v numeric
    check (grid_voltage_v is null or grid_voltage_v > 0);

comment on column public.solar_kits.grid_connection_type is
  'Tipo de ligação da unidade consumidora para a qual o kit foi configurado.';
comment on column public.solar_kits.grid_voltage_v is
  'Tensão nominal de conexão do kit, em volts.';
"""
migration_path.write_text(migration_sql, encoding='utf-8')

schema_path = repo / 'supabase-schema.sql'
schema = schema_path.read_text(encoding='utf-8')
if 'grid_connection_type text' not in schema:
    schema += "\n\n-- Compatibilidade elétrica dos kits solares\n" + migration_sql
    schema_path.write_text(schema, encoding='utf-8')


# -----------------------------------------------------------------------------
# Testes
# -----------------------------------------------------------------------------
compatibility_test_path = repo / 'tests/electrical-compatibility.test.ts'
compatibility_test_path.write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateElectricalCompatibility } from '../src/lib/calculations/electricalCompatibility';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('confirma ligação e tensão nominal compatíveis', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'biphase',
    customerVoltageV: 220,
    kitConnectionType: 'biphase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'compatible');
  assert.equal(result.requiresConnectionUpgrade, false);
});

test('indica aumento de carga quando o kit exige mais fases', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'monophase',
    customerVoltageV: 220,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'connection_upgrade_required');
  assert.equal(result.requiresConnectionUpgrade, true);
  assert.match(result.guidance, /aumento de carga/i);
});

test('aceita pequena diferença entre tensões nominais', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'biphase',
    customerVoltageV: 220,
    kitConnectionType: 'biphase',
    kitVoltageV: 230,
  });

  assert.equal(result.status, 'compatible');
});

test('solicita adequação quando a tensão diverge além da tolerância', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'triphase',
    customerVoltageV: 220,
    kitConnectionType: 'triphase',
    kitVoltageV: 380,
  });

  assert.equal(result.status, 'voltage_adaptation_required');
});

test('ligação menor que a unidade exige análise de balanceamento', () => {
  const result = calculateElectricalCompatibility({
    customerConnectionType: 'triphase',
    customerVoltageV: 220,
    kitConnectionType: 'monophase',
    kitVoltageV: 220,
  });

  assert.equal(result.status, 'technical_review');
  assert.match(result.guidance, /balanceamento de fases/i);
});

test('catálogo e proposta coletam e exibem os dados elétricos', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Ligação atendida \*/);
  assert.match(catalog, /Tensão nominal V \*/);
  assert.match(calculator, /Tensão da unidade consumidora/);
  assert.match(calculator, /Compatibilidade elétrica/);
  assert.match(calculator, /A relação está acima da referência de 1,20[\s\S]*não bloqueia a compatibilidade do kit/);
});
""", encoding='utf-8')

operations_test_path = repo / 'tests/solarKitOperations.test.ts'
operations_test = operations_test_path.read_text(encoding='utf-8')
if "grid_connection_type: 'biphase'" not in operations_test:
    operations_test = replace_once(
        operations_test,
        "  inverter_power_kw: 5,\n  structure_type: 'Telhado cerâmico',",
        "  inverter_power_kw: 5,\n  grid_connection_type: 'biphase',\n  grid_voltage_v: 220,\n  structure_type: 'Telhado cerâmico',",
        'fixture do formulário do kit',
    )
    operations_test = replace_once(
        operations_test,
        "    inverter_power_kw: 5,\n    structure_type: 'Telhado cerâmico',",
        "    inverter_power_kw: 5,\n    grid_connection_type: 'biphase',\n    grid_voltage_v: 220,\n    structure_type: 'Telhado cerâmico',",
        'fixture SolarKit',
    )
    operations_test = replace_once(
        operations_test,
        "  assert.equal(normalized.module_quantity, 10);\n  assert.equal(normalized.battery_brand, null);",
        "  assert.equal(normalized.module_quantity, 10);\n  assert.equal(normalized.grid_connection_type, 'biphase');\n  assert.equal(normalized.grid_voltage_v, 220);\n  assert.equal(normalized.battery_brand, null);",
        'asserções elétricas de normalização',
    )
    operations_test = replace_once(
        operations_test,
        "  assert.equal(snapshot.system_type, 'hybrid');\n  assert.equal(snapshot.battery_capacity_kwh, 10);",
        "  assert.equal(snapshot.system_type, 'hybrid');\n  assert.equal(snapshot.grid_connection_type, 'biphase');\n  assert.equal(snapshot.grid_voltage_v, 220);\n  assert.equal(snapshot.battery_capacity_kwh, 10);",
        'asserções elétricas do snapshot',
    )
operations_test_path.write_text(operations_test, encoding='utf-8')

print('Compatibilidade elétrica dos kits aplicada.')
