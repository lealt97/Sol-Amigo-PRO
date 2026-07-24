from pathlib import Path

repo = Path('.')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Trecho esperado não encontrado em {label}:\n{old}')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# Tipos e snapshot do kit
# -----------------------------------------------------------------------------
types_path = repo / 'src/types/solarKit.ts'
types = types_path.read_text(encoding='utf-8')

for old, new, label in [
    (
        '  inverter_power_kw: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;',
        '  inverter_power_kw: number | null;\n  inverter_max_pv_power_kwp?: number | null;\n  inverter_max_dc_ac_ratio?: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;',
        'SolarKit',
    ),
    (
        '  inverter_power_kw?: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;',
        '  inverter_power_kw?: number | null;\n  inverter_max_pv_power_kwp?: number | null;\n  inverter_max_dc_ac_ratio?: number | null;\n  grid_connection_type?: SolarKitConnectionType | null;',
        'SolarKitFormValues',
    ),
    (
        '  inverter_power_kw: number | null;\n  grid_connection_type: SolarKitConnectionType | null;',
        '  inverter_power_kw: number | null;\n  inverter_max_pv_power_kwp: number | null;\n  inverter_max_dc_ac_ratio: number | null;\n  grid_connection_type: SolarKitConnectionType | null;',
        'SolarKitSnapshot',
    ),
    (
        '    inverter_power_kw: kit.inverter_power_kw,\n    grid_connection_type: kit.grid_connection_type ?? null,',
        '    inverter_power_kw: kit.inverter_power_kw,\n    inverter_max_pv_power_kwp: kit.inverter_max_pv_power_kwp ?? null,\n    inverter_max_dc_ac_ratio: kit.inverter_max_dc_ac_ratio ?? null,\n    grid_connection_type: kit.grid_connection_type ?? null,',
        'buildSolarKitSnapshot',
    ),
]:
    if new not in types:
        types = replace_once(types, old, new, label)

types_path.write_text(types, encoding='utf-8')


# -----------------------------------------------------------------------------
# Normalização e operações do catálogo
# -----------------------------------------------------------------------------
operations_path = repo / 'src/lib/kits/solarKitOperations.ts'
operations = operations_path.read_text(encoding='utf-8')

for old, new, label in [
    (
        '  inverter_power_kw: number | null;\n  grid_connection_type: SolarKitConnectionType | null;',
        '  inverter_power_kw: number | null;\n  inverter_max_pv_power_kwp: number | null;\n  inverter_max_dc_ac_ratio: number | null;\n  grid_connection_type: SolarKitConnectionType | null;',
        'NormalizedSolarKitValues',
    ),
    (
        '    inverter_power_kw: normalizeOptionalNumber(kit.inverter_power_kw),\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),',
        '    inverter_power_kw: normalizeOptionalNumber(kit.inverter_power_kw),\n    inverter_max_pv_power_kwp: normalizeOptionalNumber(kit.inverter_max_pv_power_kwp),\n    inverter_max_dc_ac_ratio: normalizeOptionalNumber(kit.inverter_max_dc_ac_ratio),\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),',
        'normalizeSolarKitPayload',
    ),
    (
        '    inverter_power_kw: kit.inverter_power_kw,\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),',
        '    inverter_power_kw: kit.inverter_power_kw,\n    inverter_max_pv_power_kwp: kit.inverter_max_pv_power_kwp ?? null,\n    inverter_max_dc_ac_ratio: kit.inverter_max_dc_ac_ratio ?? null,\n    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),',
        'solarKitToFormValues',
    ),
    (
        '      kit.inverter_model,\n      kit.grid_connection_type,',
        '      kit.inverter_model,\n      kit.inverter_max_pv_power_kwp,\n      kit.inverter_max_dc_ac_ratio,\n      kit.grid_connection_type,',
        'filterSolarKits',
    ),
]:
    if new not in operations:
        operations = replace_once(operations, old, new, label)

operations_path.write_text(operations, encoding='utf-8')


# -----------------------------------------------------------------------------
# Motor de validação dos limites DC do fabricante
# -----------------------------------------------------------------------------
limits_path = repo / 'src/lib/calculations/inverterDcLimits.ts'
limits_path.write_text("""export type InverterDcLimitStatus =
  | 'within_manufacturer_limit'
  | 'above_manufacturer_limit'
  | 'documentation_pending';

export type InverterDcLimitInput = {
  dcPowerKwp: number;
  acPowerKw: number | null;
  maxPvInputPowerKwp: number | null;
  maxDcAcRatio: number | null;
};

export type InverterDcLimitResult = {
  status: InverterDcLimitStatus;
  statusLabel: string;
  guidance: string;
  dcPowerKwp: number;
  acPowerKw: number | null;
  maxPvInputPowerKwp: number | null;
  maxDcAcRatio: number | null;
  maxByRatioKwp: number | null;
  effectiveMaxDcPowerKwp: number | null;
};

const round = (value: number, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const positiveOrNull = (value: number | null) => (
  value != null && Number.isFinite(value) && value > 0 ? value : null
);

const format = (value: number) => value.toLocaleString('pt-BR', {
  maximumFractionDigits: 3,
});

export function evaluateInverterDcLimits(
  input: InverterDcLimitInput,
): InverterDcLimitResult {
  if (!Number.isFinite(input.dcPowerKwp) || input.dcPowerKwp <= 0) {
    throw new Error('A potência DC dos módulos deve ser maior que zero.');
  }

  const acPowerKw = positiveOrNull(input.acPowerKw);
  const maxPvInputPowerKwp = positiveOrNull(input.maxPvInputPowerKwp);
  const maxDcAcRatio = positiveOrNull(input.maxDcAcRatio);
  const maxByRatioKwp = acPowerKw != null && maxDcAcRatio != null
    ? acPowerKw * maxDcAcRatio
    : null;
  const availableLimits = [maxPvInputPowerKwp, maxByRatioKwp]
    .filter((value): value is number => value != null);
  const common = {
    dcPowerKwp: round(input.dcPowerKwp),
    acPowerKw: acPowerKw == null ? null : round(acPowerKw),
    maxPvInputPowerKwp: maxPvInputPowerKwp == null ? null : round(maxPvInputPowerKwp),
    maxDcAcRatio: maxDcAcRatio == null ? null : round(maxDcAcRatio),
    maxByRatioKwp: maxByRatioKwp == null ? null : round(maxByRatioKwp),
  };

  if (availableLimits.length === 0) {
    return {
      ...common,
      status: 'documentation_pending',
      statusLabel: 'Validação documental pendente',
      guidance: 'Cadastre a potência FV máxima ou a relação DC/AC máxima informada no datasheet do inversor. O percentual de oversizing, sozinho, não define incompatibilidade.',
      effectiveMaxDcPowerKwp: null,
    };
  }

  const effectiveMaxDcPowerKwp = Math.min(...availableLimits);
  if (input.dcPowerKwp > effectiveMaxDcPowerKwp + 1e-9) {
    return {
      ...common,
      status: 'above_manufacturer_limit',
      statusLabel: 'Acima do limite do fabricante',
      guidance: `A potência DC de ${format(input.dcPowerKwp)} kWp ultrapassa o limite efetivo de ${format(effectiveMaxDcPowerKwp)} kWp obtido dos dados cadastrados do inversor. Revise o conjunto ou o datasheet antes de continuar.`,
      effectiveMaxDcPowerKwp: round(effectiveMaxDcPowerKwp),
    };
  }

  return {
    ...common,
    status: 'within_manufacturer_limit',
    statusLabel: 'Dentro do limite do fabricante',
    guidance: `A potência DC de ${format(input.dcPowerKwp)} kWp está dentro do limite efetivo de ${format(effectiveMaxDcPowerKwp)} kWp informado para o modelo do inversor.`,
    effectiveMaxDcPowerKwp: round(effectiveMaxDcPowerKwp),
  };
}
""", encoding='utf-8')


# -----------------------------------------------------------------------------
# Formulário e tabela do catálogo
# -----------------------------------------------------------------------------
catalog_path = repo / 'src/pages/kits/SolarKitCatalog.tsx'
catalog = catalog_path.read_text(encoding='utf-8')

for old, new, label in [
    (
        '  inverter_power_kw: string;\n  grid_connection_type: SolarKitConnectionType | \'\';',
        '  inverter_power_kw: string;\n  inverter_max_pv_power_kwp: string;\n  inverter_max_dc_ac_ratio: string;\n  grid_connection_type: SolarKitConnectionType | \'\';',
        'SolarKitFormState',
    ),
    (
        "  inverter_power_kw: '',\n  grid_connection_type: '',",
        "  inverter_power_kw: '',\n  inverter_max_pv_power_kwp: '',\n  inverter_max_dc_ac_ratio: '',\n  grid_connection_type: '',",
        'EMPTY_FORM',
    ),
    (
        "  inverter_power_kw: kit.inverter_power_kw ? String(kit.inverter_power_kw) : '',\n  grid_connection_type: kit.grid_connection_type || '',",
        "  inverter_power_kw: kit.inverter_power_kw ? String(kit.inverter_power_kw) : '',\n  inverter_max_pv_power_kwp: kit.inverter_max_pv_power_kwp ? String(kit.inverter_max_pv_power_kwp) : '',\n  inverter_max_dc_ac_ratio: kit.inverter_max_dc_ac_ratio ? String(kit.inverter_max_dc_ac_ratio) : '',\n  grid_connection_type: kit.grid_connection_type || '',",
        'toFormState',
    ),
    (
        '  inverter_power_kw: parseOptionalNumber(form.inverter_power_kw),\n  grid_connection_type: form.grid_connection_type || null,',
        '  inverter_power_kw: parseOptionalNumber(form.inverter_power_kw),\n  inverter_max_pv_power_kwp: parseOptionalNumber(form.inverter_max_pv_power_kwp),\n  inverter_max_dc_ac_ratio: parseOptionalNumber(form.inverter_max_dc_ac_ratio),\n  grid_connection_type: form.grid_connection_type || null,',
        'toPayload',
    ),
    (
        '        kit.inverter_model,\n        kit.grid_connection_type ?',
        '        kit.inverter_model,\n        kit.inverter_max_pv_power_kwp ? `${kit.inverter_max_pv_power_kwp} kWp FV máx.` : null,\n        kit.inverter_max_dc_ac_ratio ? `DC/AC máx. ${kit.inverter_max_dc_ac_ratio}` : null,\n        kit.grid_connection_type ?',
        'filteredKits',
    ),
    (
        "    if ((parseOptionalNumber(form.grid_voltage_v) ?? 0) <= 0) return 'Informe a tensão nominal do kit em volts.';\n    if (hasStorage",
        "    if ((parseOptionalNumber(form.grid_voltage_v) ?? 0) <= 0) return 'Informe a tensão nominal do kit em volts.';\n    if (form.inverter_max_pv_power_kwp && (parseOptionalNumber(form.inverter_max_pv_power_kwp) ?? 0) <= 0) return 'A potência FV máxima do inversor deve ser maior que zero.';\n    if (form.inverter_max_dc_ac_ratio && (parseOptionalNumber(form.inverter_max_dc_ac_ratio) ?? 0) <= 0) return 'A relação DC/AC máxima do inversor deve ser maior que zero.';\n    if (hasStorage",
        'validateForm',
    ),
    (
        'placeholder="Buscar por kit, fornecedor, módulo, inversor, ligação, tensão ou bateria..."',
        'placeholder="Buscar por kit, fornecedor, módulo, inversor, limites, ligação, tensão ou bateria..."',
        'placeholder de busca',
    ),
    (
        "                      <div className=\"text-[11px] text-slate-500\">{kit.grid_voltage_v ? `${kit.grid_voltage_v} V` : 'Tensão não informada'}</div>\n                    </td>",
        "                      <div className=\"text-[11px] text-slate-500\">{kit.grid_voltage_v ? `${kit.grid_voltage_v} V` : 'Tensão não informada'}</div>\n                      <div className=\"mt-1 text-[11px] text-slate-500\">\n                        {kit.inverter_max_pv_power_kwp ? `FV máx. ${kit.inverter_max_pv_power_kwp} kWp` : 'Potência FV máxima não informada'}\n                        {kit.inverter_max_dc_ac_ratio ? ` · DC/AC máx. ${kit.inverter_max_dc_ac_ratio}` : ''}\n                      </div>\n                    </td>",
        'tabela elétrica',
    ),
]:
    if new not in catalog:
        catalog = replace_once(catalog, old, new, label)

old_inverter_section = """                <div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5\">
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Marca</label><Input value={form.inverter_brand} onChange={(event) => updateField('inverter_brand', event.target.value)} placeholder=\"Ex: Deye\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Modelo</label><Input value={form.inverter_model} onChange={(event) => updateField('inverter_model', event.target.value)} placeholder=\"Ex: SUN-5K-SG04LP1\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Potência kW</label><Input type=\"number\" min=\"0\" step=\"0.01\" value={form.inverter_power_kw} onChange={(event) => updateField('inverter_power_kw', event.target.value)} placeholder=\"5\" /></div>
                  <div className=\"space-y-2\">
                    <label className=\"text-sm font-medium text-brand-dark\">Ligação atendida *</label>
                    <select value={form.grid_connection_type} onChange={(event) => updateField('grid_connection_type', event.target.value as SolarKitConnectionType)} className=\"flex h-10 w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2\">
                      <option value=\"\">Selecione</option>
                      <option value=\"monophase\">Monofásica</option>
                      <option value=\"biphase\">Bifásica</option>
                      <option value=\"triphase\">Trifásica</option>
                    </select>
                  </div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Tensão nominal V *</label><Input type=\"number\" min=\"1\" step=\"1\" value={form.grid_voltage_v} onChange={(event) => updateField('grid_voltage_v', event.target.value)} placeholder=\"Ex: 220\" /></div>
                </div>"""
new_inverter_section = """                <div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4\">
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Marca</label><Input value={form.inverter_brand} onChange={(event) => updateField('inverter_brand', event.target.value)} placeholder=\"Ex: Deye\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Modelo</label><Input value={form.inverter_model} onChange={(event) => updateField('inverter_model', event.target.value)} placeholder=\"Ex: SUN-5K-SG04LP1\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Potência AC kW</label><Input type=\"number\" min=\"0\" step=\"0.01\" value={form.inverter_power_kw} onChange={(event) => updateField('inverter_power_kw', event.target.value)} placeholder=\"5\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Potência FV máxima kWp</label><Input type=\"number\" min=\"0\" step=\"0.01\" value={form.inverter_max_pv_power_kwp} onChange={(event) => updateField('inverter_max_pv_power_kwp', event.target.value)} placeholder=\"Ex: 7,5\" /></div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Relação DC/AC máxima</label><Input type=\"number\" min=\"0\" step=\"0.01\" value={form.inverter_max_dc_ac_ratio} onChange={(event) => updateField('inverter_max_dc_ac_ratio', event.target.value)} placeholder=\"Ex: 1,50\" /></div>
                  <div className=\"space-y-2\">
                    <label className=\"text-sm font-medium text-brand-dark\">Ligação atendida *</label>
                    <select value={form.grid_connection_type} onChange={(event) => updateField('grid_connection_type', event.target.value as SolarKitConnectionType)} className=\"flex h-10 w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2\">
                      <option value=\"\">Selecione</option>
                      <option value=\"monophase\">Monofásica</option>
                      <option value=\"biphase\">Bifásica</option>
                      <option value=\"triphase\">Trifásica</option>
                    </select>
                  </div>
                  <div className=\"space-y-2\"><label className=\"text-sm font-medium text-brand-dark\">Tensão nominal V *</label><Input type=\"number\" min=\"1\" step=\"1\" value={form.grid_voltage_v} onChange={(event) => updateField('grid_voltage_v', event.target.value)} placeholder=\"Ex: 220\" /></div>
                  <div className=\"rounded-lg border border-brand-border bg-gray-50 px-4 py-3 text-xs leading-5 text-slate-500\">Informe pelo menos um limite do datasheet quando disponível. Se ambos forem cadastrados, o sistema respeita o mais restritivo.</div>
                </div>"""
if new_inverter_section not in catalog:
    catalog = replace_once(catalog, old_inverter_section, new_inverter_section, 'seção do inversor')

catalog_path.write_text(catalog, encoding='utf-8')


# -----------------------------------------------------------------------------
# Dimensionamento: validação real do fabricante e oversizing informativo
# -----------------------------------------------------------------------------
calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')

for old, new, label in [
    (
        "import { calculateDcAcOversizing } from '../../lib/calculations/oversizing';\nimport { calculateElectricalCompatibility }",
        "import { calculateDcAcOversizing } from '../../lib/calculations/oversizing';\nimport { evaluateInverterDcLimits } from '../../lib/calculations/inverterDcLimits';\nimport { calculateElectricalCompatibility }",
        'import do limite do inversor',
    ),
    (
        "  }, [selectedKit]);\n\n  const selectedKitElectricalCompatibility = useMemo(() => {",
        "  }, [selectedKit]);\n\n  const selectedKitInverterDcLimit = useMemo(() => {\n    if (!selectedKit) return null;\n\n    try {\n      return evaluateInverterDcLimits({\n        dcPowerKwp: selectedKit.kit_power_kwp,\n        acPowerKw: selectedKit.inverter_power_kw ?? null,\n        maxPvInputPowerKwp: selectedKit.inverter_max_pv_power_kwp ?? null,\n        maxDcAcRatio: selectedKit.inverter_max_dc_ac_ratio ?? null,\n      });\n    } catch {\n      return null;\n    }\n  }, [selectedKit]);\n\n  const selectedKitElectricalCompatibility = useMemo(() => {",
        'memo do limite do inversor',
    ),
    (
        "    if (currentStep === 4 && !selectedKit) {\n      toast.error('Selecione um kit on-grid cadastrado.');\n      return false;\n    }",
        "    if (currentStep === 4) {\n      if (!selectedKit) {\n        toast.error('Selecione um kit on-grid cadastrado.');\n        return false;\n      }\n      if (selectedKitInverterDcLimit?.status === 'above_manufacturer_limit') {\n        toast.error('O kit ultrapassa o limite DC cadastrado para o inversor.');\n        return false;\n      }\n    }",
        'bloqueio pelo limite do fabricante',
    ),
    (
        "                            <Detail label=\"Potência AC do inversor\" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />\n                            <Detail label=\"Ligação atendida pelo kit\"",
        "                            <Detail label=\"Potência AC do inversor\" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />\n                            <Detail label=\"Potência FV máxima\" value={selectedKit.inverter_max_pv_power_kwp ? `${number.format(selectedKit.inverter_max_pv_power_kwp)} kWp` : 'Não informada'} />\n                            <Detail label=\"Relação DC/AC máxima\" value={selectedKit.inverter_max_dc_ac_ratio ? number.format(selectedKit.inverter_max_dc_ac_ratio) : 'Não informada'} />\n                            <Detail label=\"Ligação atendida pelo kit\"",
        'detalhes dos limites do inversor',
    ),
]:
    if new not in calculator:
        calculator = replace_once(calculator, old, new, label)

old_oversizing_block = """                    {selectedKitOversizing ? (
                      <div className={`rounded-xl border p-5 ${
                        selectedKitOversizing.status === 'reference'
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : 'border-brand-light/30 bg-brand-blue/10'
                      }`}>
                        <div className=\"flex items-start gap-3\">
                          {selectedKitOversizing.status === 'reference' ? (
                            <CheckCircle2 className=\"mt-0.5 h-6 w-6 shrink-0 text-emerald-300\" />
                          ) : (
                            <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-brand-light\" />
                          )}
                          <div className=\"min-w-0\">
                            <p className=\"text-xs font-bold uppercase tracking-wider text-brand-light\">Configuração DC/AC do kit</p>
                            <h3 className=\"mt-1 text-lg font-bold text-brand-dark\">{selectedKitOversizing.statusLabel}</h3>
                            <p className=\"mt-1 text-sm leading-6 text-slate-200\">
                              {selectedKitOversizing.status === 'above_reference'
                                ? 'A relação está acima da referência de 1,20, mas faz parte do conjunto cadastrado pelo fornecedor e não bloqueia a compatibilidade do kit. Confirme os limites elétricos e as condições de garantia no datasheet.'
                                : selectedKitOversizing.guidance}
                            </p>
                          </div>
                        </div>
                        <div className=\"mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">
                          <Summary label=\"Potência DC dos módulos\" value={`${number.format(selectedKitOversizing.dcPowerKwp)} kWp`} />
                          <Summary label=\"Potência AC do inversor\" value={`${number.format(selectedKitOversizing.acPowerKw)} kW`} />
                          <Summary label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />
                          <Summary label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} highlight />
                        </div>
                      </div>
                    ) : (
                      <div className=\"flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-5 text-amber-100\">
                        <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0\" />
                        <div>
                          <p className=\"font-bold\">Potência AC do inversor não informada</p>
                          <p className=\"mt-1 text-sm leading-6\">Cadastre a potência do inversor no catálogo do kit para calcular a relação DC/AC e o oversizing.</p>
                        </div>
                      </div>
                    )}"""
new_oversizing_block = """                    {selectedKitInverterDcLimit && (
                      <div className={`rounded-xl border p-5 ${
                        selectedKitInverterDcLimit.status === 'within_manufacturer_limit'
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : selectedKitInverterDcLimit.status === 'above_manufacturer_limit'
                            ? 'border-red-400/50 bg-red-500/10'
                            : 'border-slate-400/40 bg-slate-500/10'
                      }`}>
                        <div className=\"flex items-start gap-3\">
                          {selectedKitInverterDcLimit.status === 'within_manufacturer_limit' ? (
                            <CheckCircle2 className=\"mt-0.5 h-6 w-6 shrink-0 text-emerald-300\" />
                          ) : selectedKitInverterDcLimit.status === 'above_manufacturer_limit' ? (
                            <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0 text-red-300\" />
                          ) : (
                            <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-slate-300\" />
                          )}
                          <div className=\"min-w-0\">
                            <p className=\"text-xs font-bold uppercase tracking-wider text-brand-light\">Limite técnico do inversor</p>
                            <h3 className=\"mt-1 text-lg font-bold text-brand-dark\">{selectedKitInverterDcLimit.statusLabel}</h3>
                            <p className=\"mt-1 text-sm leading-6 text-slate-200\">{selectedKitInverterDcLimit.guidance}</p>
                          </div>
                        </div>
                        <div className=\"mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">
                          <Summary label=\"Potência DC do kit\" value={`${number.format(selectedKitInverterDcLimit.dcPowerKwp)} kWp`} />
                          <Summary label=\"Potência FV máxima\" value={selectedKitInverterDcLimit.maxPvInputPowerKwp == null ? 'Não informada' : `${number.format(selectedKitInverterDcLimit.maxPvInputPowerKwp)} kWp`} />
                          <Summary label=\"Máximo pela relação DC/AC\" value={selectedKitInverterDcLimit.maxByRatioKwp == null ? 'Não calculado' : `${number.format(selectedKitInverterDcLimit.maxByRatioKwp)} kWp`} />
                          <Summary label=\"Limite efetivo\" value={selectedKitInverterDcLimit.effectiveMaxDcPowerKwp == null ? 'Pendente' : `${number.format(selectedKitInverterDcLimit.effectiveMaxDcPowerKwp)} kWp`} highlight={selectedKitInverterDcLimit.status !== 'documentation_pending'} />
                        </div>
                      </div>
                    )}

                    {selectedKitOversizing ? (
                      <div className=\"rounded-xl border border-brand-light/30 bg-brand-blue/10 p-5\">
                        <div className=\"flex items-start gap-3\">
                          <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-brand-light\" />
                          <div className=\"min-w-0\">
                            <p className=\"text-xs font-bold uppercase tracking-wider text-brand-light\">Relação DC/AC informativa</p>
                            <h3 className=\"mt-1 text-lg font-bold text-brand-dark\">Oversizing calculado</h3>
                            <p className=\"mt-1 text-sm leading-6 text-slate-200\">A referência de 1,20 é apenas comparativa e não define a compatibilidade do inversor. O status técnico é determinado pelos limites específicos cadastrados a partir do datasheet.</p>
                          </div>
                        </div>
                        <div className=\"mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">
                          <Summary label=\"Potência DC dos módulos\" value={`${number.format(selectedKitOversizing.dcPowerKwp)} kWp`} />
                          <Summary label=\"Potência AC do inversor\" value={`${number.format(selectedKitOversizing.acPowerKw)} kW`} />
                          <Summary label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />
                          <Summary label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} highlight />
                        </div>
                      </div>
                    ) : (
                      <div className=\"flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-5 text-amber-100\">
                        <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0\" />
                        <div>
                          <p className=\"font-bold\">Potência AC do inversor não informada</p>
                          <p className=\"mt-1 text-sm leading-6\">Cadastre a potência do inversor no catálogo do kit para calcular a relação DC/AC e o oversizing.</p>
                        </div>
                      </div>
                    )}"""
if new_oversizing_block not in calculator:
    calculator = replace_once(calculator, old_oversizing_block, new_oversizing_block, 'cartões DC/AC')

calculator_path.write_text(calculator, encoding='utf-8')


# -----------------------------------------------------------------------------
# Migração e schema de referência
# -----------------------------------------------------------------------------
migration_sql = """-- Limites DC do fabricante para o inversor do kit
alter table public.solar_kits
  add column if not exists inverter_max_pv_power_kwp numeric
    check (inverter_max_pv_power_kwp is null or inverter_max_pv_power_kwp > 0),
  add column if not exists inverter_max_dc_ac_ratio numeric
    check (inverter_max_dc_ac_ratio is null or inverter_max_dc_ac_ratio > 0);

comment on column public.solar_kits.inverter_max_pv_power_kwp is
  'Potência FV máxima admitida pelo modelo do inversor, em kWp, conforme datasheet.';
comment on column public.solar_kits.inverter_max_dc_ac_ratio is
  'Relação DC/AC máxima admitida pelo modelo do inversor, conforme datasheet.';
"""
(repo / 'supabase/migrations/20260724234906_add_inverter_manufacturer_dc_limits.sql').write_text(migration_sql, encoding='utf-8')

schema_path = repo / 'supabase-schema.sql'
schema = schema_path.read_text(encoding='utf-8')
if 'inverter_max_pv_power_kwp' not in schema:
    schema = schema.rstrip() + '\n\n\n-- Limites DC do fabricante para o inversor do kit\n' + migration_sql
    schema_path.write_text(schema, encoding='utf-8')


# -----------------------------------------------------------------------------
# Testes
# -----------------------------------------------------------------------------
limits_test_path = repo / 'tests/inverter-dc-limits.test.ts'
limits_test_path.write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateInverterDcLimits } from '../src/lib/calculations/inverterDcLimits';

const CATALOG = 'src/pages/kits/SolarKitCatalog.tsx';
const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('aceita oversizing acima de 20% quando está dentro da relação máxima do fabricante', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'within_manufacturer_limit');
  assert.equal(result.maxByRatioKwp, 7.5);
  assert.equal(result.effectiveMaxDcPowerKwp, 7.5);
});

test('bloqueia somente quando ultrapassa o limite cadastrado do fabricante', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 7.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'above_manufacturer_limit');
  assert.match(result.guidance, /ultrapassa o limite efetivo/i);
});

test('respeita a potência FV máxima explícita do datasheet', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: 6.5,
    maxDcAcRatio: 1.5,
  });

  assert.equal(result.status, 'above_manufacturer_limit');
  assert.equal(result.effectiveMaxDcPowerKwp, 6.5);
});

test('mantém validação documental pendente quando o limite não foi cadastrado', () => {
  const result = evaluateInverterDcLimits({
    dcPowerKwp: 6.6,
    acPowerKw: 5,
    maxPvInputPowerKwp: null,
    maxDcAcRatio: null,
  });

  assert.equal(result.status, 'documentation_pending');
  assert.equal(result.effectiveMaxDcPowerKwp, null);
});

test('catálogo coleta limites e proposta trata 1,20 apenas como referência informativa', async () => {
  const [catalog, calculator] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(CALCULATOR, 'utf8'),
  ]);

  assert.match(catalog, /Potência FV máxima kWp/);
  assert.match(catalog, /Relação DC\/AC máxima/);
  assert.match(calculator, /A referência de 1,20 é apenas comparativa/);
  assert.match(calculator, /above_manufacturer_limit/);
  assert.match(calculator, /O kit ultrapassa o limite DC cadastrado para o inversor/);
});
""", encoding='utf-8')

operations_test_path = repo / 'tests/solarKitOperations.test.ts'
operations_test = operations_test_path.read_text(encoding='utf-8')
for old, new, label in [
    (
        '  inverter_power_kw: 5,\n  grid_connection_type: \'biphase\',',
        '  inverter_power_kw: 5,\n  inverter_max_pv_power_kwp: 7.5,\n  inverter_max_dc_ac_ratio: 1.5,\n  grid_connection_type: \'biphase\',',
        'baseForm',
    ),
    (
        '    inverter_power_kw: 5,\n    grid_connection_type: \'biphase\',',
        '    inverter_power_kw: 5,\n    inverter_max_pv_power_kwp: 7.5,\n    inverter_max_dc_ac_ratio: 1.5,\n    grid_connection_type: \'biphase\',',
        'makeKit',
    ),
    (
        "  assert.equal(normalized.grid_voltage_v, 220);\n  assert.equal(normalized.battery_brand, null);",
        "  assert.equal(normalized.grid_voltage_v, 220);\n  assert.equal(normalized.inverter_max_pv_power_kwp, 7.5);\n  assert.equal(normalized.inverter_max_dc_ac_ratio, 1.5);\n  assert.equal(normalized.battery_brand, null);",
        'asserts de normalização',
    ),
    (
        "  assert.equal(snapshot.grid_voltage_v, 220);\n  assert.equal(snapshot.battery_capacity_kwh, 10);",
        "  assert.equal(snapshot.grid_voltage_v, 220);\n  assert.equal(snapshot.inverter_max_pv_power_kwp, 7.5);\n  assert.equal(snapshot.inverter_max_dc_ac_ratio, 1.5);\n  assert.equal(snapshot.battery_capacity_kwh, 10);",
        'asserts do snapshot',
    ),
]:
    if new not in operations_test:
        operations_test = replace_once(operations_test, old, new, label)
operations_test_path.write_text(operations_test, encoding='utf-8')

electrical_test_path = repo / 'tests/electrical-compatibility.test.ts'
electrical_test = electrical_test_path.read_text(encoding='utf-8')
old_assert = "  assert.match(calculator, /A relação está acima da referência de 1,20[\\s\\S]*não bloqueia a compatibilidade do kit/);"
new_assert = "  assert.match(calculator, /A referência de 1,20 é apenas comparativa[\\s\\S]*limites específicos cadastrados/);"
if new_assert not in electrical_test:
    electrical_test = replace_once(electrical_test, old_assert, new_assert, 'assert do oversizing informativo')
electrical_test_path.write_text(electrical_test, encoding='utf-8')
