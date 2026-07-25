export type SolarSystemType = 'on_grid' | 'hybrid' | 'off_grid';

export const SOLAR_SYSTEM_TYPE_LABELS: Record<SolarSystemType, string> = {
  on_grid: 'On-grid',
  hybrid: 'Híbrido',
  off_grid: 'Off-grid',
};

export type SolarKitConnectionType = 'monophase' | 'biphase' | 'triphase';

export const SOLAR_KIT_CONNECTION_TYPE_LABELS: Record<SolarKitConnectionType, string> = {
  monophase: 'Monofásica',
  biphase: 'Bifásica',
  triphase: 'Trifásica',
};

export interface SolarKit {
  id: string;
  user_id: string;
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
  grid_connection_type?: SolarKitConnectionType | null;
  grid_voltage_v?: number | null;
  structure_type: string | null;
  battery_brand: string | null;
  battery_model: string | null;
  battery_capacity_kwh: number | null;
  usable_battery_capacity_kwh: number | null;
  battery_quantity: number | null;
  backup_power_kw: number | null;
  autonomy_hours: number | null;
  essential_loads_description: string | null;
  kit_power_kwp: number;
  cost_price: number;
  sale_price: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolarKitFormValues {
  name: string;
  supplier?: string | null;
  system_type?: SolarSystemType;
  module_brand?: string | null;
  module_model?: string | null;
  module_power_w: number;
  module_quantity: number;
  inverter_brand?: string | null;
  inverter_model?: string | null;
  inverter_power_kw?: number | null;
  grid_connection_type?: SolarKitConnectionType | null;
  grid_voltage_v?: number | null;
  structure_type?: string | null;
  battery_brand?: string | null;
  battery_model?: string | null;
  battery_capacity_kwh?: number | null;
  usable_battery_capacity_kwh?: number | null;
  battery_quantity?: number | null;
  backup_power_kw?: number | null;
  autonomy_hours?: number | null;
  essential_loads_description?: string | null;
  cost_price: number;
  sale_price?: number | null;
  active: boolean;
  notes?: string | null;
}

export interface SolarKitSnapshot {
  id: string;
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
  kit_power_kwp: number;
  cost_price: number;
  sale_price: number | null;
}

export function buildSolarKitSnapshot(kit: SolarKit): SolarKitSnapshot {
  return {
    id: kit.id,
    name: kit.name,
    supplier: kit.supplier,
    system_type: kit.system_type || 'on_grid',
    module_brand: kit.module_brand,
    module_model: kit.module_model,
    module_power_w: kit.module_power_w,
    module_quantity: kit.module_quantity,
    inverter_brand: kit.inverter_brand,
    inverter_model: kit.inverter_model,
    inverter_power_kw: kit.inverter_power_kw,
    grid_connection_type: kit.grid_connection_type ?? null,
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
    kit_power_kwp: kit.kit_power_kwp,
    cost_price: kit.cost_price,
    sale_price: kit.sale_price,
  };
}
