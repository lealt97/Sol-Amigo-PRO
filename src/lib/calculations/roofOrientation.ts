import {
  ROOF_CARDINAL_OPTIONS,
  type RoofCardinalDirection,
  type RoofPlaneConfiguration,
} from '../../types/roof';

export type RoofPlaneYieldResult = RoofPlaneConfiguration & {
  orientationFactor: number;
  orientationLossPercent: number;
};

export type RoofOrientationResult = {
  latitudeDegrees: number;
  referenceTiltDegrees: number;
  referenceAzimuthDegrees: number;
  totalAreaM2: number;
  weightedOrientationFactor: number;
  orientationLossPercent: number;
  planes: RoofPlaneYieldResult[];
};

const DEG_TO_RAD = Math.PI / 180;
const DEFAULT_LATITUDE_DEGREES = -20;
const GROUND_ALBEDO = 0.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function normalizeAzimuthDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function inferRoofCardinalDirection(azimuthDegrees: number): Exclude<RoofCardinalDirection, 'CUSTOM'> {
  const normalized = normalizeAzimuthDegrees(azimuthDegrees);
  const index = Math.round(normalized / 45) % ROOF_CARDINAL_OPTIONS.length;
  return ROOF_CARDINAL_OPTIONS[index].value;
}

export function getRoofCardinalLabel(direction: RoofCardinalDirection) {
  if (direction === 'CUSTOM') return 'Azimute personalizado';
  return ROOF_CARDINAL_OPTIONS.find((option) => option.value === direction)?.label ?? direction;
}

function assertFinite(value: number, field: string) {
  if (!Number.isFinite(value)) throw new Error(`${field} deve ser um número válido.`);
}

function validatePlane(plane: RoofPlaneConfiguration, index: number) {
  assertFinite(plane.areaM2, `Área útil da água ${index + 1}`);
  assertFinite(plane.tiltDegrees, `Inclinação da água ${index + 1}`);
  assertFinite(plane.azimuthDegrees, `Azimute da água ${index + 1}`);

  if (plane.areaM2 <= 0) throw new Error(`A área útil da água ${index + 1} deve ser maior que zero.`);
  if (plane.tiltDegrees < 0 || plane.tiltDegrees > 90) {
    throw new Error(`A inclinação da água ${index + 1} deve estar entre 0° e 90°.`);
  }
  if (plane.azimuthDegrees < 0 || plane.azimuthDegrees >= 360) {
    throw new Error(`O azimute da água ${index + 1} deve estar entre 0° e 359,99°.`);
  }
}

function estimateAnnualPlaneIrradianceProxy(
  latitudeDegrees: number,
  tiltDegrees: number,
  azimuthDegrees: number,
) {
  const latitude = latitudeDegrees * DEG_TO_RAD;
  const tilt = tiltDegrees * DEG_TO_RAD;
  const azimuth = normalizeAzimuthDegrees(azimuthDegrees) * DEG_TO_RAD;

  const panelEast = Math.sin(tilt) * Math.sin(azimuth);
  const panelNorth = Math.sin(tilt) * Math.cos(azimuth);
  const panelUp = Math.cos(tilt);

  let total = 0;

  // Amostragem anual geométrica em intervalos de 10 dias e 30 minutos.
  // O resultado é usado como fator relativo à orientação de referência,
  // sem substituir uma simulação meteorológica horária de engenharia.
  for (let dayOfYear = 5; dayOfYear <= 365; dayOfYear += 10) {
    const declination = 23.44
      * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365)
      * DEG_TO_RAD;
    const seasonalDistanceFactor = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);

    for (let solarHour = 0; solarHour < 24; solarHour += 0.5) {
      const hourAngle = (solarHour - 12) * 15 * DEG_TO_RAD;
      const sunEast = -Math.cos(declination) * Math.sin(hourAngle);
      const sunNorth = Math.cos(latitude) * Math.sin(declination)
        - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
      const sunUp = Math.sin(latitude) * Math.sin(declination)
        + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);

      if (sunUp <= 0) continue;

      const incidenceCosine = Math.max(
        0,
        sunEast * panelEast + sunNorth * panelNorth + sunUp * panelUp,
      );
      const relativeAirMass = 1 / Math.max(sunUp, 0.08);
      const atmosphericTransmission = Math.exp(-0.12 * Math.max(relativeAirMass - 1, 0));
      const directNormalProxy = seasonalDistanceFactor * atmosphericTransmission;
      const diffuseHorizontalProxy = seasonalDistanceFactor * 0.18 * sunUp;
      const globalHorizontalProxy = directNormalProxy * sunUp + diffuseHorizontalProxy;

      const beamOnPlane = directNormalProxy * incidenceCosine;
      const skyDiffuseOnPlane = diffuseHorizontalProxy * (1 + Math.cos(tilt)) / 2;
      const groundReflectedOnPlane = globalHorizontalProxy
        * GROUND_ALBEDO
        * (1 - Math.cos(tilt))
        / 2;

      total += beamOnPlane + skyDiffuseOnPlane + groundReflectedOnPlane;
    }
  }

  return total;
}

export function calculateRoofPlaneOrientationFactor(input: {
  latitudeDegrees?: number | null;
  tiltDegrees: number;
  azimuthDegrees: number;
}) {
  const latitudeDegrees = input.latitudeDegrees ?? DEFAULT_LATITUDE_DEGREES;
  assertFinite(latitudeDegrees, 'Latitude do local');
  assertFinite(input.tiltDegrees, 'Inclinação');
  assertFinite(input.azimuthDegrees, 'Azimute');

  if (latitudeDegrees < -90 || latitudeDegrees > 90) {
    throw new Error('A latitude do local deve estar entre -90° e 90°.');
  }
  if (input.tiltDegrees < 0 || input.tiltDegrees > 90) {
    throw new Error('A inclinação deve estar entre 0° e 90°.');
  }
  if (input.azimuthDegrees < 0 || input.azimuthDegrees >= 360) {
    throw new Error('O azimute deve estar entre 0° e 359,99°.');
  }

  const referenceTiltDegrees = clamp(Math.abs(latitudeDegrees), 5, 40);
  const referenceAzimuthDegrees = latitudeDegrees <= 0 ? 0 : 180;
  const referenceIrradiance = estimateAnnualPlaneIrradianceProxy(
    latitudeDegrees,
    referenceTiltDegrees,
    referenceAzimuthDegrees,
  );
  const planeIrradiance = estimateAnnualPlaneIrradianceProxy(
    latitudeDegrees,
    input.tiltDegrees,
    input.azimuthDegrees,
  );

  if (referenceIrradiance <= 0) return 1;
  return round(clamp(planeIrradiance / referenceIrradiance, 0.35, 1), 4);
}

export function calculateRoofOrientation(input: {
  latitudeDegrees?: number | null;
  planes: RoofPlaneConfiguration[];
}): RoofOrientationResult {
  const latitudeDegrees = input.latitudeDegrees ?? DEFAULT_LATITUDE_DEGREES;
  assertFinite(latitudeDegrees, 'Latitude do local');
  if (latitudeDegrees < -90 || latitudeDegrees > 90) {
    throw new Error('A latitude do local deve estar entre -90° e 90°.');
  }
  if (input.planes.length === 0) throw new Error('Cadastre pelo menos uma água do telhado.');

  input.planes.forEach(validatePlane);

  const planes = input.planes.map((plane) => {
    const orientationFactor = calculateRoofPlaneOrientationFactor({
      latitudeDegrees,
      tiltDegrees: plane.tiltDegrees,
      azimuthDegrees: plane.azimuthDegrees,
    });

    return {
      ...plane,
      azimuthDegrees: normalizeAzimuthDegrees(plane.azimuthDegrees),
      cardinalDirection: plane.cardinalDirection === 'CUSTOM'
        ? 'CUSTOM'
        : inferRoofCardinalDirection(plane.azimuthDegrees),
      orientationFactor,
      orientationLossPercent: round((1 - orientationFactor) * 100, 2),
    } satisfies RoofPlaneYieldResult;
  });

  const totalAreaM2 = planes.reduce((total, plane) => total + plane.areaM2, 0);
  const weightedOrientationFactor = planes.reduce(
    (total, plane) => total + plane.orientationFactor * plane.areaM2,
    0,
  ) / totalAreaM2;
  const referenceTiltDegrees = clamp(Math.abs(latitudeDegrees), 5, 40);
  const referenceAzimuthDegrees = latitudeDegrees <= 0 ? 0 : 180;

  return {
    latitudeDegrees: round(latitudeDegrees, 4),
    referenceTiltDegrees: round(referenceTiltDegrees, 2),
    referenceAzimuthDegrees,
    totalAreaM2: round(totalAreaM2, 2),
    weightedOrientationFactor: round(weightedOrientationFactor, 4),
    orientationLossPercent: round((1 - weightedOrientationFactor) * 100, 2),
    planes,
  };
}
