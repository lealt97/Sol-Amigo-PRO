import { supabase } from '../lib/supabase/client';
import {
  createSolarKitOperations,
  type NormalizedSolarKitValues,
  type SolarKitInsertValues,
} from '../lib/kits/solarKitOperations';
import type { SolarKit } from '../types/solarKit';

async function listKits(): Promise<SolarKit[]> {
  const { data, error } = await supabase
    .from('solar_kits')
    .select('*')
    .order('kit_power_kwp', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SolarKit[];
}

async function listActiveKits(): Promise<SolarKit[]> {
  const { data, error } = await supabase
    .from('solar_kits')
    .select('*')
    .eq('active', true)
    .order('kit_power_kwp', { ascending: true });

  if (error) throw error;
  return data as SolarKit[];
}

async function insertKit(values: SolarKitInsertValues): Promise<SolarKit> {
  const { data, error } = await supabase
    .from('solar_kits')
    .insert([values])
    .select()
    .single();

  if (error) throw error;
  return data as SolarKit;
}

async function updateKit(
  id: string,
  values: NormalizedSolarKitValues,
): Promise<SolarKit> {
  const { data, error } = await supabase
    .from('solar_kits')
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SolarKit;
}

async function removeKit(id: string) {
  const { error } = await supabase
    .from('solar_kits')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function setKitActive(id: string, active: boolean): Promise<SolarKit> {
  const { data, error } = await supabase
    .from('solar_kits')
    .update({ active })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SolarKit;
}

export const solarKitService = createSolarKitOperations({
  list: listKits,
  listActive: listActiveKits,
  insert: insertKit,
  update: updateKit,
  remove: removeKit,
  setActive: setKitActive,
});
