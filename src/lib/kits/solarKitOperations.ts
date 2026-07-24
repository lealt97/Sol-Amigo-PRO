import type {
  SolarKit,
  SolarKitConnectionType,
  SolarKitFormValues,
  SolarSystemType,
} from '../../types/solarKit';

export type NormalizedSolarKitValues = {
  name: string;
  supplier: string | null;
  system_type: SolarSystemType;
  module_brand: string | null;
  module_model: string | null;
  module_power_w: number;
  module_quantity: number;
  inverter_brand: string | null;
  inverter_model: string | null;
  inverter_power_kw: number | null;
  grid_connection_type: SolarKitConnectionType | null;
  grid_voltage_v: number | null;
  structure_type: string | null;
  battery_brand: string | null;
  battery_model: string | null;
  battery_capacity_kwh: number | null;
  usable_battery_capacity_kwh: number | null;
  battery_quantity: number | null;
  backup_power_kw: number | null;
  autonomy_hours: number | null;
  essential_loads_description: string | null;
  cost_price: number;
  sale_price: number | null;
  active: boolean;
  notes: string | null;
};

export type SolarKitInsertValues = NormalizedSolarKitValues & {
  user_id: string;
};

export interface SolarKitRepository {
  list(): Promise<SolarKit[]>;
  listActive(): Promise<SolarKit[]>;
  insert(values: SolarKitInsertValues): Promise<SolarKit>;
  update(id: string, values: NormalizedSolarKitValues): Promise<SolarKit>;
  remove(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<SolarKit>;
}

export function normalizeSolarSystemType(
  value?: SolarSystemType | string | null,
): SolarSystemType {
  if (value === 'hybrid' || value === 'off_grid') return value;
  return 'on_grid';
}

export function normalizeSolarKitConnectionType(
  value?: SolarKitConnectionType | string | null,
): SolarKitConnectionType | null {
  if (value === 'monophase' || value === 'biphase' || value === 'triphase') return value;
  return null;
}

function normalizeText(value?: string | null) {
  return value?.trim() || null;
}

function normalizeRequiredNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSolarKitPayload(
  kit: SolarKitFormValues,
): NormalizedSolarKitValues {
  const systemType = normalizeSolarSystemType(kit.system_type);
  const hasStorage = systemType === 'hybrid' || systemType === 'off_grid';

  return {
    name: kit.name.trim(),
    supplier: normalizeText(kit.supplier),
    system_type: systemType,
    module_brand: normalizeText(kit.module_brand),
    module_model: normalizeText(kit.module_model),
    module_power_w: normalizeRequiredNumber(kit.module_power_w),
    module_quantity: Math.round(normalizeRequiredNumber(kit.module_quantity)),
    inverter_brand: normalizeText(kit.inverter_brand),
    inverter_model: normalizeText(kit.inverter_model),
    inverter_power_kw: normalizeOptionalNumber(kit.inverter_power_kw),
    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),
    grid_voltage_v: normalizeOptionalNumber(kit.grid_voltage_v),
    structure_type: normalizeText(kit.structure_type),
    battery_brand: hasStorage ? normalizeText(kit.battery_brand) : null,
    battery_model: hasStorage ? normalizeText(kit.battery_model) : null,
    battery_capacity_kwh: hasStorage
      ? normalizeOptionalNumber(kit.battery_capacity_kwh)
      : null,
    usable_battery_capacity_kwh: hasStorage
      ? normalizeOptionalNumber(kit.usable_battery_capacity_kwh)
      : null,
    battery_quantity: hasStorage
      ? normalizeOptionalNumber(kit.battery_quantity)
      : null,
    backup_power_kw: hasStorage
      ? normalizeOptionalNumber(kit.backup_power_kw)
      : null,
    autonomy_hours: hasStorage
      ? normalizeOptionalNumber(kit.autonomy_hours)
      : null,
    essential_loads_description: hasStorage
      ? normalizeText(kit.essential_loads_description)
      : null,
    cost_price: normalizeRequiredNumber(kit.cost_price),
    sale_price: normalizeOptionalNumber(kit.sale_price),
    active: Boolean(kit.active),
    notes: normalizeText(kit.notes),
  };
}

export function solarKitToFormValues(kit: SolarKit): SolarKitFormValues {
  return {
    name: kit.name,
    supplier: kit.supplier,
    system_type: normalizeSolarSystemType(kit.system_type),
    module_brand: kit.module_brand,
    module_model: kit.module_model,
    module_power_w: kit.module_power_w,
    module_quantity: kit.module_quantity,
    inverter_brand: kit.inverter_brand,
    inverter_model: kit.inverter_model,
    inverter_power_kw: kit.inverter_power_kw,
    grid_connection_type: normalizeSolarKitConnectionType(kit.grid_connection_type),
    grid_voltage_v: kit.grid_voltage_v ?? null,
    structure_type: kit.structure_type,
    battery_brand: kit.battery_brand,
    battery_model: kit.battery_model,
    battery_capacity_kwh: kit.battery_capacity_kwh,
    usable_battery_capacity_kwh: kit.usable_battery_capacity_kwh,
    battery_quantity: kit.battery_quantity,
    backup_power_kw: kit.backup_power_kw,
    autonomy_hours: kit.autonomy_hours,
    essential_loads_description: kit.essential_loads_description,
    cost_price: kit.cost_price,
    sale_price: kit.sale_price,
    active: kit.active,
    notes: kit.notes,
  };
}

export function filterSolarKits(kits: SolarKit[], searchTerm: string) {
  const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
  if (!term) return kits;

  return kits.filter((kit) => {
    const fields = [
      kit.name,
      kit.supplier,
      kit.system_type,
      kit.module_brand,
      kit.module_model,
      kit.inverter_brand,
      kit.inverter_model,
      kit.grid_connection_type,
      kit.grid_voltage_v,
      kit.battery_brand,
      kit.battery_model,
      kit.structure_type,
    ];

    return fields.some((field) =>
      String(field || '').toLocaleLowerCase('pt-BR').includes(term),
    );
  });
}

export function recommendSolarKit(
  kits: SolarKit[],
  requiredKwp: number,
  systemType: SolarSystemType = 'on_grid',
) {
  const normalizedSystemType = normalizeSolarSystemType(systemType);
  const activeKits = kits
    .filter(
      (kit) =>
        kit.active
        && kit.kit_power_kwp > 0
        && normalizeSolarSystemType(kit.system_type) === normalizedSystemType,
    )
    .sort((left, right) => left.kit_power_kwp - right.kit_power_kwp);

  if (activeKits.length === 0 || requiredKwp <= 0) return null;

  return activeKits.find((kit) => kit.kit_power_kwp >= requiredKwp)
    || activeKits[activeKits.length - 1];
}

export function createSolarKitOperations(repository: SolarKitRepository) {
  const createKit = (kit: SolarKitFormValues, userId: string) => {
    return repository.insert({
      ...normalizeSolarKitPayload(kit),
      user_id: userId,
    });
  };

  const updateKit = (id: string, kit: SolarKitFormValues) => {
    return repository.update(id, normalizeSolarKitPayload(kit));
  };

  const duplicateKit = (kit: SolarKit, userId: string) => {
    return createKit(
      {
        ...solarKitToFormValues(kit),
        name: `${kit.name} (cópia)`,
      },
      userId,
    );
  };

  const toggleStatus = (id: string, active: boolean) => {
    return repository.setActive(id, active);
  };

  return {
    getKits: () => repository.list(),
    getActiveKits: () => repository.listActive(),
    createKit,
    updateKit,
    duplicateKit,
    deleteKit: (id: string) => repository.remove(id),
    toggleStatus,
    toggleKitStatus: toggleStatus,
    recommendKit: recommendSolarKit,
  };
}
