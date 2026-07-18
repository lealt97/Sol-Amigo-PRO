import { supabase } from '../lib/supabase/client';
import {
  ClientRepository,
  createClientOperations,
} from '../lib/clients/clientFlows';
import type { Client } from '../types/client';

const supabaseClientRepository: ClientRepository = {
  async list() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Client[];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Client;
  },

  async insert(values) {
    const { data, error } = await supabase
      .from('clients')
      .insert([values])
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async update(id, values) {
    const { data, error } = await supabase
      .from('clients')
      .update(values)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async remove(id) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const clientService = createClientOperations(supabaseClientRepository);
