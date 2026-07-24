import type { ConnectionType } from './professionalSizing';

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
