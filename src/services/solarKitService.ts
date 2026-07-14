import { supabase } from '../lib/supabase/client';
import { SolarKit, SolarKitFormValues } from '../types/solarKit';

const normalizeKitPayload = (kit: SolarKitFormValues) => ({
  name: kit.name.trim(),
  supplier: kit.supplier?.trim() || null,
  module_brand: kit.module_brand?.trim() || null,
  module_model: kit.module_model?.trim() || null,
  module_power_w: Number(kit.module_power_w) || 0,
  module_quantity: Number(kit.module_quantity) || 0,
  inverter_brand: kit.inverter_brand?.trim() || null,
  inverter_model: kit.inverter_model?.trim() || null,
  inverter_power_kw: kit.inverter_power_kw ? Number(kit.inverter_power_kw) : null,
  structure_type: kit.structure_type?.trim() || null,
  cost_price: Number(kit.cost_price) || 0,
  sale_price: kit.sale_price ? Number(kit.sale_price) : null,
  active: kit.active,
  notes: kit.notes?.trim() || null,
});

export const solarKitService = {
  async getKits() {
    const { data, error } = await supabase
      .from('solar_kits')
      .select('*')
      .order('kit_power_kwp', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SolarKit[];
  },

  async getActiveKits() {
    const { data, error } = await supabase
      .from('solar_kits')
      .select('*')
      .eq('active', true)
      .order('kit_power_kwp', { ascending: true });

    if (error) throw error;
    return data as SolarKit[];
  },

  async createKit(kit: SolarKitFormValues, userId: string) {
    const { data, error } = await supabase
      .from('solar_kits')
      .insert([{ ...normalizeKitPayload(kit), user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  async updateKit(id: string, kit: SolarKitFormValues) {
    const { data, error } = await supabase
      .from('solar_kits')
      .update(normalizeKitPayload(kit))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  async duplicateKit(kit: SolarKit, userId: string) {
    const copy: SolarKitFormValues = {
      name: `${kit.name} (cópia)`,
      supplier: kit.supplier,
      module_brand: kit.module_brand,
      module_model: kit.module_model,
      module_power_w: kit.module_power_w,
      module_quantity: kit.module_quantity,
      inverter_brand: kit.inverter_brand,
      inverter_model: kit.inverter_model,
      inverter_power_kw: kit.inverter_power_kw,
      structure_type: kit.structure_type,
      cost_price: kit.cost_price,
      sale_price: kit.sale_price,
      active: kit.active,
      notes: kit.notes,
    };

    return this.createKit(copy, userId);
  },

  async deleteKit(id: string) {
    const { error } = await supabase
      .from('solar_kits')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleKitStatus(id: string, active: boolean) {
    const { data, error } = await supabase
      .from('solar_kits')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  recommendKit(kits: SolarKit[], requiredKwp: number) {
    const activeKits = kits
      .filter((kit) => kit.active && kit.kit_power_kwp > 0)
      .sort((a, b) => a.kit_power_kwp - b.kit_power_kwp);

    if (activeKits.length === 0 || requiredKwp <= 0) return null;

    const compatibleKit = activeKits.find((kit) => kit.kit_power_kwp >= requiredKwp);
    return compatibleKit || activeKits[activeKits.length - 1];
  },
};
