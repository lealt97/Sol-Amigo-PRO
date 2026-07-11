export interface RoofLayoutString {
  id: string;
  name: string;
  color: string;
}

export interface RoofLayoutModule {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  stringId: string;
}

export interface RoofLayoutData {
  modules: RoofLayoutModule[];
  strings: RoofLayoutString[];
  canvasWidth?: number;
  canvasHeight?: number;
}

export const DEFAULT_ROOF_LAYOUT_STRINGS: RoofLayoutString[] = [
  { id: 'string-1', name: 'String 1', color: '#2563EB' },
  { id: 'string-2', name: 'String 2', color: '#DC2626' },
  { id: 'string-3', name: 'String 3', color: '#16A34A' },
];

export const EMPTY_ROOF_LAYOUT: RoofLayoutData = {
  modules: [],
  strings: DEFAULT_ROOF_LAYOUT_STRINGS,
};
