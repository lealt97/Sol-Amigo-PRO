import { Compass, Layers3, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { RoofOrientationResult } from '../../lib/calculations/roofOrientation';
import { ROOF_CARDINAL_OPTIONS, type RoofCardinalDirection } from '../../types/roof';
import type { ProposalDraftRoofPlane } from '../../types/proposalDraft';

export function createRoofPlaneDraft(index = 0, areaM2 = ''): ProposalDraftRoofPlane {
  return {
    id: `roof-plane-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Água ${index + 1}`,
    areaM2,
    tiltDegrees: '20',
    azimuthDegrees: '0',
    cardinalDirection: 'N',
  };
}

type RoofPlanesEditorProps = {
  latitudeDegrees: string;
  onLatitudeChange: (value: string) => void;
  planes: ProposalDraftRoofPlane[];
  onPlanesChange: (planes: ProposalDraftRoofPlane[]) => void;
  orientationResult: RoofOrientationResult | null;
  basePerformanceRatioPercent: number | null;
};

function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function RoofPlanesEditor({
  latitudeDegrees,
  onLatitudeChange,
  planes,
  onPlanesChange,
  orientationResult,
  basePerformanceRatioPercent,
}: RoofPlanesEditorProps) {
  const updatePlane = (id: string, patch: Partial<ProposalDraftRoofPlane>) => {
    onPlanesChange(planes.map((plane) => (plane.id === id ? { ...plane, ...patch } : plane)));
  };

  const changeCardinalDirection = (plane: ProposalDraftRoofPlane, direction: RoofCardinalDirection) => {
    if (direction === 'CUSTOM') {
      updatePlane(plane.id, { cardinalDirection: direction });
      return;
    }

    const option = ROOF_CARDINAL_OPTIONS.find((item) => item.value === direction);
    updatePlane(plane.id, {
      cardinalDirection: direction,
      azimuthDegrees: String(option?.azimuthDegrees ?? 0),
    });
  };

  const addPlane = () => onPlanesChange([...planes, createRoofPlaneDraft(planes.length)]);
  const removePlane = (id: string) => {
    if (planes.length <= 1) return;
    onPlanesChange(planes.filter((plane) => plane.id !== id));
  };

  const effectivePerformanceRatioPercent = orientationResult && basePerformanceRatioPercent != null
    ? basePerformanceRatioPercent * orientationResult.weightedOrientationFactor
    : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-light/30 bg-brand-blue/10 p-4 text-sm leading-6 text-slate-500">
        Etapa opcional para a pré-proposta. Deixe a área em branco quando ainda não houver vistoria; nesse caso, nenhum ajuste de inclinação ou orientação será aplicado ao rendimento.
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <Compass className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <label className="block max-w-sm space-y-2">
              <span className="text-sm font-semibold text-brand-dark">Latitude da instalação (opcional)</span>
              <div className="relative">
                <Input
                  type="number"
                  value={latitudeDegrees}
                  min={-90}
                  max={90}
                  step="0.01"
                  inputMode="decimal"
                  onChange={(event) => onLatitudeChange(event.target.value)}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">°</span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                No Brasil, a latitude normalmente é negativa. Ela define a inclinação de referência usada para comparar as águas.
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {planes.map((plane, index) => {
          const planeResult = orientationResult?.planes.find((item) => item.id === plane.id) ?? null;

          return (
            <div key={plane.id} className="rounded-xl border border-brand-border bg-brand-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Layers3 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Água {index + 1}</p>
                    <p className="text-xs text-slate-500">Configure a superfície onde os módulos poderão ser instalados.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlane(plane.id)}
                  disabled={planes.length <= 1}
                  aria-label={`Remover ${plane.name || `água ${index + 1}`}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Nome</span>
                  <Input
                    type="text"
                    value={plane.name}
                    maxLength={40}
                    onChange={(event) => updatePlane(plane.id, { name: event.target.value })}
                    placeholder={`Água ${index + 1}`}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Área útil (opcional)</span>
                  <div className="relative">
                    <Input
                      type="number"
                      value={plane.areaM2}
                      min={0.01}
                      step="0.01"
                      inputMode="decimal"
                      onChange={(event) => updatePlane(plane.id, { areaM2: event.target.value })}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">m²</span>
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Inclinação</span>
                  <div className="relative">
                    <Input
                      type="number"
                      value={plane.tiltDegrees}
                      min={0}
                      max={90}
                      step="0.5"
                      inputMode="decimal"
                      onChange={(event) => updatePlane(plane.id, { tiltDegrees: event.target.value })}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">°</span>
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Orientação da água</span>
                  <Select
                    value={plane.cardinalDirection}
                    onChange={(event) => changeCardinalDirection(plane, event.target.value as RoofCardinalDirection)}
                  >
                    {ROOF_CARDINAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label} — {option.azimuthDegrees}°</option>
                    ))}
                    <option value="CUSTOM">Azimute personalizado</option>
                  </Select>
                  <p className="text-xs leading-5 text-slate-500">
                    Escolha um ponto cardeal ou colateral. Para maior precisão, informe o azimute personalizado.
                  </p>
                </label>
              </div>

              {plane.cardinalDirection === 'CUSTOM' && (
                <label className="mt-4 block max-w-xs space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Azimute personalizado</span>
                  <div className="relative">
                    <Input
                      type="number"
                      value={plane.azimuthDegrees}
                      min={0}
                      max={359.99}
                      step="0.1"
                      inputMode="decimal"
                      onChange={(event) => updatePlane(plane.id, { azimuthDegrees: event.target.value })}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">°</span>
                  </div>
                  <p className="text-xs text-slate-500">Convenção: Norte 0°, Leste 90°, Sul 180° e Oeste 270°.</p>
                </label>
              )}

              {planeResult && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-brand-border bg-brand-gray/40 px-3 py-1.5 text-slate-500">
                    Fator solar: <strong className="text-brand-dark">{formatPercent(planeResult.orientationFactor * 100)}%</strong>
                  </span>
                  <span className="rounded-full border border-brand-border bg-brand-gray/40 px-3 py-1.5 text-slate-500">
                    Perda relativa: <strong className="text-brand-dark">{formatPercent(planeResult.orientationLossPercent)}%</strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" className="gap-2" onClick={addPlane}>
        <Plus className="h-4 w-4" /> Adicionar água do telhado
      </Button>

      {orientationResult && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Área útil total</p>
            <p className="mt-2 text-xl font-black text-brand-dark">{orientationResult.totalAreaM2.toLocaleString('pt-BR')} m²</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fator solar ponderado</p>
            <p className="mt-2 text-xl font-black text-brand-dark">{formatPercent(orientationResult.weightedOrientationFactor * 100)}%</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rendimento-base</p>
            <p className="mt-2 text-xl font-black text-brand-dark">
              {basePerformanceRatioPercent == null ? '—' : `${formatPercent(basePerformanceRatioPercent)}%`}
            </p>
          </div>
          <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Rendimento global efetivo</p>
            <p className="mt-2 text-xl font-black text-brand-dark">
              {effectivePerformanceRatioPercent == null ? '—' : `${formatPercent(effectivePerformanceRatioPercent)}%`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
