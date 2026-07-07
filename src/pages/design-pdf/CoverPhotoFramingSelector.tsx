import React from 'react';
import { TransformConfig } from '../../types/pdfModels';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';

const defaultTransform: TransformConfig = { zoom: 1, x: 0, y: 0, rotate: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeTransform(transform?: TransformConfig): TransformConfig {
  return {
    zoom: Number(transform?.zoom ?? defaultTransform.zoom),
    x: Number(transform?.x ?? defaultTransform.x),
    y: Number(transform?.y ?? defaultTransform.y),
    rotate: Number(transform?.rotate ?? defaultTransform.rotate),
  };
}

export function getDefaultTransform(): TransformConfig {
  return { ...defaultTransform };
}

function transformToFocus(transform?: TransformConfig) {
  const t = normalizeTransform(transform);
  return {
    x: clamp(50 - t.x / 5, 0, 100),
    y: clamp(50 - t.y / 6, 0, 100),
  };
}

function focusToTransform(focusX: number, focusY: number, current?: TransformConfig): TransformConfig {
  const t = normalizeTransform(current);
  return {
    ...t,
    x: Number(((50 - focusX) * 5).toFixed(2)),
    y: Number(((50 - focusY) * 6).toFixed(2)),
  };
}

interface CoverPhotoFramingSelectorProps {
  imageUrl: string;
  transform: TransformConfig;
  onChange: (transform: TransformConfig) => void;
  onReset: () => void;
}

export function CoverPhotoFramingSelector({ imageUrl, transform, onChange, onReset }: CoverPhotoFramingSelectorProps) {
  const t = normalizeTransform(transform);
  const focus = transformToFocus(t);

  const updateFocusFromEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const focusX = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const focusY = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange(focusToTransform(focusX, focusY, t));
  };

  const updateFocusX = (value: number) => onChange(focusToTransform(value, focus.y, t));
  const updateFocusY = (value: number) => onChange(focusToTransform(focus.x, value, t));

  return (
    <div className="space-y-3 mt-4 border-t border-brand-border pt-4">
      <div>
        <Label className="text-xs text-slate-500 uppercase tracking-wider">Enquadramento da imagem original</Label>
        <p className="text-xs text-slate-500 mt-1">
          Clique no ponto principal da paisagem. Esse ponto será priorizado no crop da área foto_aqui.
        </p>
      </div>

      <div
        className="relative aspect-video overflow-hidden rounded-lg border border-brand-border bg-slate-100 cursor-crosshair select-none"
        onMouseDown={updateFocusFromEvent}
        onMouseMove={(event) => {
          if (event.buttons === 1) updateFocusFromEvent(event);
        }}
      >
        <img src={imageUrl} alt="Imagem original para enquadramento" className="w-full h-full object-contain pointer-events-none" />
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        <div
          className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white bg-brand-primary shadow-lg pointer-events-none"
          style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
        />
        <div className="absolute w-px h-full top-0 bg-white/70 pointer-events-none" style={{ left: `${focus.x}%` }} />
        <div className="absolute h-px w-full left-0 bg-white/70 pointer-events-none" style={{ top: `${focus.y}%` }} />
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Zoom do crop</span>
            <span>{t.zoom.toFixed(2)}x</span>
          </div>
          <input type="range" min="1" max="3" step="0.05" value={t.zoom} onChange={(event) => onChange({ ...t, zoom: Number(event.target.value) })} className="w-full" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Foco horizontal</span>
            <span>{Math.round(focus.x)}%</span>
          </div>
          <input type="range" min="0" max="100" step="1" value={focus.x} onChange={(event) => updateFocusX(Number(event.target.value))} className="w-full" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Foco vertical</span>
            <span>{Math.round(focus.y)}%</span>
          </div>
          <input type="range" min="0" max="100" step="1" value={focus.y} onChange={(event) => updateFocusY(Number(event.target.value))} className="w-full" />
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onReset}>
        Resetar enquadramento
      </Button>
    </div>
  );
}
