export type RoofCardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'CUSTOM';

export type RoofPlaneConfiguration = {
  id: string;
  name: string;
  areaM2: number;
  tiltDegrees: number;
  azimuthDegrees: number;
  cardinalDirection: RoofCardinalDirection;
};

export const ROOF_CARDINAL_OPTIONS: Array<{
  value: Exclude<RoofCardinalDirection, 'CUSTOM'>;
  label: string;
  azimuthDegrees: number;
}> = [
  { value: 'N', label: 'Norte (N)', azimuthDegrees: 0 },
  { value: 'NE', label: 'Nordeste (NE)', azimuthDegrees: 45 },
  { value: 'E', label: 'Leste (L)', azimuthDegrees: 90 },
  { value: 'SE', label: 'Sudeste (SE)', azimuthDegrees: 135 },
  { value: 'S', label: 'Sul (S)', azimuthDegrees: 180 },
  { value: 'SW', label: 'Sudoeste (SO)', azimuthDegrees: 225 },
  { value: 'W', label: 'Oeste (O)', azimuthDegrees: 270 },
  { value: 'NW', label: 'Noroeste (NO)', azimuthDegrees: 315 },
];
