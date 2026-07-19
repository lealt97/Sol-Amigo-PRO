import { ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, ArrowUp, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Label } from '../../../components/ui/Label';
import { TransformConfig } from '../types/pdfDesignTypes';
import { normalizeTransform } from './CoverPhotoFramingSelector';

interface TransformControlsProps {
  label: string;
  value?: TransformConfig;
  target?: 'logo' | 'cover';
  onChange: (key: keyof TransformConfig, value: number) => void;
  onReset: () => void;
}

export function TransformControls({ label, value, target = 'cover', onChange, onReset }: TransformControlsProps) {
  const raw = normalizeTransform(value);
  const minZoom = target === 'cover' ? 1 : 0.1;
  const t = {
    ...raw,
    zoom: Math.max(minZoom, raw.zoom),
  };
  const step = target === 'logo' ? 10 : 25;

  const updateRotation = (nextValue: number) => {
    let normalizedRot = nextValue % 360;
    if (normalizedRot > 180) normalizedRot -= 360;
    if (normalizedRot < -180) normalizedRot += 360;
    onChange('rotate', normalizedRot);
  };

  return (
    <div className="space-y-4 mt-4 border-t border-brand-border pt-4 text-brand-dark">
      <Label className="text-xs text-slate-400 uppercase tracking-wider font-bold block">{label} - Ajustes de Enquadramento</Label>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Escala (Zoom)</span>
          <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-white font-semibold">{Math.round(t.zoom * 100)}%</span>
        </div>
        <div className="flex gap-2 items-center">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('zoom', Math.max(minZoom, Number((t.zoom - 0.1).toFixed(2))))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <input type="range" min={minZoom} max="4" step="0.05" value={t.zoom} onChange={(event) => onChange('zoom', Number(parseFloat(event.target.value).toFixed(2)))} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-blue" />
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('zoom', Number((t.zoom + 0.1).toFixed(2)))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Rotação Precisa</span>
          <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-white font-semibold">{t.rotate}°</span>
        </div>
        <div className="flex gap-1 items-center justify-between">
          <div className="flex gap-0.5">
            <Button type="button" variant="outline" className="h-7 px-1.5 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white font-medium cursor-pointer" onClick={() => updateRotation(t.rotate - 90)} title="Girar -90°">-90°</Button>
            <Button type="button" variant="outline" className="h-7 px-1 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => updateRotation(t.rotate - 5)} title="Ajuste -5°">-5°</Button>
            <Button type="button" variant="outline" className="h-7 px-1 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => updateRotation(t.rotate - 1)} title="Ajuste fino -1°">-1°</Button>
          </div>
          <div className="flex gap-0.5 text-slate-500">
            <RotateCcw className="w-3.5 h-3.5" />
            <RotateCw className="w-3.5 h-3.5" />
          </div>
          <div className="flex gap-0.5">
            <Button type="button" variant="outline" className="h-7 px-1 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => updateRotation(t.rotate + 1)} title="Ajuste fino +1°">+1°</Button>
            <Button type="button" variant="outline" className="h-7 px-1 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => updateRotation(t.rotate + 5)} title="Ajuste +5°">+5°</Button>
            <Button type="button" variant="outline" className="h-7 px-1.5 text-[10px] bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white font-medium cursor-pointer" onClick={() => updateRotation(t.rotate + 90)} title="Girar +90°">+90°</Button>
          </div>
        </div>
        <input type="range" min="-180" max="180" step="1" value={t.rotate} onChange={(event) => updateRotation(Number(event.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-blue mt-2" />
      </div>

      <div className="grid grid-cols-3 gap-2 items-center justify-items-center bg-slate-950/40 p-3 rounded-lg border border-brand-border/50">
        <div />
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('y', t.y - step)}><ArrowUp className="w-3.5 h-3.5" /></Button>
        <div />
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('x', t.x - step)}><ArrowLeftIcon className="w-3.5 h-3.5" /></Button>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={onReset}><RotateCcw className="w-3.5 h-3.5" /></Button>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('x', t.x + step)}><ArrowRight className="w-3.5 h-3.5" /></Button>
        <div />
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-brand-border/60 hover:border-slate-400 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" onClick={() => onChange('y', t.y + step)}><ArrowDown className="w-3.5 h-3.5" /></Button>
        <div />
      </div>
    </div>
  );
}
