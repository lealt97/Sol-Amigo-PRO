from pathlib import Path
import re


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    if old not in source:
        raise RuntimeError(f'Padrão não encontrado: {label}')
    return source.replace(old, new, 1)


def regex_once(source: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count == 0:
        if replacement in source:
            return source
        raise RuntimeError(f'Padrão regex não encontrado: {label}')
    return updated


# ---------------------------------------------------------------------------
# proposalService: permite persistir o resumo técnico nas novas colunas.
# ---------------------------------------------------------------------------
service_path = Path('src/services/proposalService.ts')
service = service_path.read_text()
service = replace_once(
    service,
    "  | 'roof_area_m2'\n  | 'roof_image_url'\n  | 'module_width_m'",
    "  | 'roof_area_m2'\n  | 'roof_image_url'\n  | 'roof_latitude_degrees'\n  | 'roof_planes_json'\n  | 'roof_orientation_factor'\n  | 'effective_performance_ratio'\n  | 'module_width_m'",
    'campos do resumo da proposta',
)
service_path.write_text(service)


# ---------------------------------------------------------------------------
# Wizard principal.
# ---------------------------------------------------------------------------
path = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
source = path.read_text()

source = replace_once(
    source,
    "import {\n  calculateProfessionalSizing,\n  CONNECTION_AVAILABILITY_KWH,\n  type ConnectionType,\n  type ProfessionalSizingResult,\n} from '../../lib/calculations/professionalSizing';",
    "import {\n  calculateProfessionalSizing,\n  CONNECTION_AVAILABILITY_KWH,\n  type ConnectionType,\n  type ProfessionalSizingResult,\n} from '../../lib/calculations/professionalSizing';\nimport { calculateRoofOrientation, type RoofOrientationResult } from '../../lib/calculations/roofOrientation';",
    'import do cálculo de orientação',
)

source = replace_once(
    source,
    "  type ProposalDraftPaybackForm,\n  type ProposalDraftState,",
    "  type ProposalDraftPaybackForm,\n  type ProposalDraftRoofPlane,\n  type ProposalDraftState,",
    'tipo das águas no rascunho',
)

source = replace_once(
    source,
    "import { RoofPhotoUpload } from './RoofPhotoUpload';",
    "import { RoofPhotoUpload } from './RoofPhotoUpload';\nimport { RoofPlanesEditor, createRoofPlaneDraft } from './RoofPlanesEditor';",
    'editor das águas',
)

source = source.replace("{ id: 'modules', title: 'Área do telhado M²' }", "{ id: 'modules', title: 'Telhado e orientação' }")

source = replace_once(
    source,
    "  const [roofAreaM2, setRoofAreaM2] = useState('');\n\n  const [kits, setKits]",
    "  const [roofAreaM2, setRoofAreaM2] = useState('');\n  const [siteLatitudeDegrees, setSiteLatitudeDegrees] = useState('-20');\n  const [roofPlanes, setRoofPlanes] = useState<ProposalDraftRoofPlane[]>([createRoofPlaneDraft(0)]);\n\n  const [kits, setKits]",
    'estado das águas',
)

source = replace_once(
    source,
    "    setRoofAreaM2(state.roofAreaM2);\n    setRoofPhotoReference(state.roofPhotoReference);",
    "    setRoofAreaM2(state.roofAreaM2);\n    setSiteLatitudeDegrees(state.siteLatitudeDegrees || '-20');\n    setRoofPlanes(state.roofPlanes?.length\n      ? state.roofPlanes\n      : [createRoofPlaneDraft(0, state.roofAreaM2)]);\n    setRoofPhotoReference(state.roofPhotoReference);",
    'hidratação das águas',
)

orientation_block = """  const roofOrientationCalculation = useMemo<{ result: RoofOrientationResult | null; error: string | null }>(() => {
    try {
      const latitudeDegrees = parseNumber(siteLatitudeDegrees);
      const planes = roofPlanes.map((plane, index) => ({
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

"""
if 'const roofOrientationCalculation = useMemo' not in source:
    source = source.replace('  const calculation = useMemo(() => {', orientation_block + '  const calculation = useMemo(() => {', 1)

source = replace_once(
    source,
    "          performanceRatioPercent: performanceRatio,\n          generationIncreasePercent: generationIncrease,",
    "          performanceRatioPercent: performanceRatio,\n          roofOrientationFactor: roofOrientationResult?.weightedOrientationFactor ?? 1,\n          generationIncreasePercent: generationIncrease,",
    'fator no cálculo profissional',
)

source = replace_once(
    source,
    "    performanceRatioPercent,\n    generationIncreasePercent,",
    "    performanceRatioPercent,\n    roofOrientationResult,\n    generationIncreasePercent,",
    'dependência do fator solar',
)

source = regex_once(
    source,
    r"    if \(currentStep === 3\) \{\n      const parsedRoofArea = parseNumber\(roofAreaM2\);\n      if \(!Number\.isFinite\(parsedRoofArea\) \|\| parsedRoofArea <= 0\) \{\n        toast\.error\('Informe a área do telhado em m² com um valor maior que zero\.'\);\n        return false;\n      \}\n    \}",
    """    if (currentStep === 3) {
      if (!roofOrientationResult) {
        toast.error(roofOrientationCalculation.error || 'Revise as águas, inclinações e orientações do telhado.');
        return false;
      }
    }""",
    'validação da etapa de telhado',
)

source = replace_once(
    source,
    "    roofAreaM2,\n    roofPhotoReference,",
    "    roofAreaM2,\n    siteLatitudeDegrees,\n    roofPlanes,\n    roofPhotoReference,",
    'persistência no estado do fluxo',
)

source = replace_once(
    source,
    "      roof_area_m2: parseOptionalNumber(roofAreaM2),\n      roof_image_url: roofPhotoReference,\n      module_width_m:",
    "      roof_area_m2: roofOrientationResult?.totalAreaM2 ?? parseOptionalNumber(roofAreaM2),\n      roof_image_url: roofPhotoReference,\n      roof_latitude_degrees: roofOrientationResult?.latitudeDegrees ?? parseOptionalNumber(siteLatitudeDegrees),\n      roof_planes_json: roofOrientationResult?.planes.map(({ orientationFactor: _factor, orientationLossPercent: _loss, ...plane }) => plane) ?? [],\n      roof_orientation_factor: roofOrientationResult?.weightedOrientationFactor ?? null,\n      effective_performance_ratio: calculation.result?.performanceRatio ?? null,\n      module_width_m:",
    'resumo técnico do telhado',
)

source = source.replace('HSP, rendimento e meta de geração', 'HSP, perdas e meta de geração')
source = source.replace(
    'Informe a HSP, o rendimento global e quanto o cliente deseja gerar além do consumo compensável.',
    'Informe a HSP, o rendimento-base do sistema e quanto o cliente deseja gerar além do consumo compensável. A orientação do telhado será aplicada na próxima etapa.',
)
source = source.replace('label="Rendimento global"', 'label="Rendimento-base do sistema"')
source = source.replace('helper="Faixa adotada neste fluxo: 75% a 80%."', 'helper="Perdas elétricas, térmicas e operacionais. A inclinação e o azimute serão aplicados separadamente."')

old_roof_section = """            {currentStep === 3 && (
              <section className=\"space-y-6\">
                <div>
                  <h2 className=\"text-lg font-bold text-brand-dark\">Área do telhado M²</h2>
                  <p className=\"mt-1 text-sm text-slate-500\">
                    Informe a área útil disponível. As dimensões A × L dos módulos serão carregadas automaticamente do kit selecionado na próxima etapa.
                  </p>
                </div>

                <div className=\"rounded-xl border border-brand-border bg-brand-gray/30 p-5\">
                  <div className=\"max-w-md\">
                    <Field
                      label=\"Área do telhado\"
                      value={roofAreaM2}
                      onChange={setRoofAreaM2}
                      suffix=\"m²\"
                      min={0.01}
                      step=\"0.01\"
                      helper=\"Informe somente a área útil disponível para instalação dos módulos.\"
                    />
                  </div>
                </div>

                <RoofPhotoUpload
                  clientId={selectedClient?.id ?? null}
                  initialStorageReference={roofPhotoReference}
                  onReferenceChange={setRoofPhotoReference}
                />
              </section>
            )}"""
new_roof_section = """            {currentStep === 3 && (
              <section className=\"space-y-6\">
                <div>
                  <h2 className=\"text-lg font-bold text-brand-dark\">Águas, inclinação e orientação do telhado</h2>
                  <p className=\"mt-1 text-sm text-slate-500\">
                    Cadastre cada água disponível. A área de cada superfície pondera o impacto da inclinação e do ponto cardeal na geração global.
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
                  <div className=\"flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm text-amber-200\">
                    <AlertTriangle className=\"mt-0.5 h-5 w-5 shrink-0\" />
                    <p>{roofOrientationCalculation.error}</p>
                  </div>
                )}

                <RoofPhotoUpload
                  clientId={selectedClient?.id ?? null}
                  initialStorageReference={roofPhotoReference}
                  onReferenceChange={setRoofPhotoReference}
                />
              </section>
            )}"""
source = replace_once(source, old_roof_section, new_roof_section, 'interface da etapa de telhado')

source = replace_once(
    source,
    "                           HSP adotada: <strong>{hspDaily} h/dia</strong> e rendimento global de <strong>{performanceRatioPercent}%</strong>.\n                           O saldo mensal estimado",
    "                           HSP adotada: <strong>{hspDaily} h/dia</strong>, rendimento-base de <strong>{performanceRatioPercent}%</strong>, fator solar do telhado de <strong>{number.format(result.roofOrientationFactor * 100)}%</strong> e rendimento global efetivo de <strong>{number.format(result.effectivePerformanceRatioPercent)}%</strong>.\n                           O saldo mensal estimado",
    'explicação do rendimento no kit',
)

source = replace_once(
    source,
    "                            <PreviewRow label=\"Geração estimada\" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh/mês`} />\n                            <PreviewRow label=\"Cobertura da meta\"",
    "                            <PreviewRow label=\"Geração estimada\" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh/mês`} />\n                            <PreviewRow label=\"Fator solar do telhado\" value={`${number.format(result.roofOrientationFactor * 100)}%`} />\n                            <PreviewRow label=\"Rendimento global efetivo\" value={`${number.format(result.effectivePerformanceRatioPercent)}%`} />\n                            <PreviewRow label=\"Cobertura da meta\"",
    'resultado técnico com orientação',
)

source = replace_once(
    source,
    "            moduleSizing={moduleSizing.result}\n          />",
    "            moduleSizing={moduleSizing.result}\n            roofOrientationResult={roofOrientationResult}\n          />",
    'prop do resumo lateral',
)

source = replace_once(
    source,
    "  generationIncreasePercent,\n  moduleSizing,\n}: {",
    "  generationIncreasePercent,\n  moduleSizing,\n  roofOrientationResult,\n}: {",
    'assinatura do resumo lateral',
)

source = replace_once(
    source,
    "  generationIncreasePercent: string;\n  moduleSizing: ModuleSizingResult | null;\n}) {",
    "  generationIncreasePercent: string;\n  moduleSizing: ModuleSizingResult | null;\n  roofOrientationResult: RoofOrientationResult | null;\n}) {",
    'tipo do resumo lateral',
)

source = replace_once(
    source,
    "            <PreviewRow label=\"HSP\" value={Number.isFinite(parseNumber(hspDaily)) ? `${number.format(parseNumber(hspDaily))} h/dia` : 'Não informada'} />\n            <PreviewRow\n              label=\"Energia de geração\"",
    "            <PreviewRow label=\"HSP\" value={Number.isFinite(parseNumber(hspDaily)) ? `${number.format(parseNumber(hspDaily))} h/dia` : 'Não informada'} />\n            {roofOrientationResult && (\n              <>\n                <PreviewRow label=\"Águas cadastradas\" value={`${roofOrientationResult.planes.length}`} />\n                <PreviewRow label=\"Fator solar do telhado\" value={`${number.format(roofOrientationResult.weightedOrientationFactor * 100)}%`} />\n                <PreviewRow label=\"Rendimento global efetivo\" value={result ? `${number.format(result.effectivePerformanceRatioPercent)}%` : 'Aguardando cálculo'} />\n              </>\n            )}\n            <PreviewRow\n              label=\"Energia de geração\"",
    'resumo lateral da orientação',
)

path.write_text(source)
