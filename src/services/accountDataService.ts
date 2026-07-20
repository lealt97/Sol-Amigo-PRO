import { supabase } from '../lib/supabase/client';

function createDownload(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const accountDataService = {
  async exportAccountData() {
    const { data, error } = await supabase.functions.invoke('account-data-export', {
      body: {},
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));

    const date = new Date().toISOString().slice(0, 10);
    createDownload(data, `solamigo-export-${date}.json`);
    return data;
  },

  async deleteAccount() {
    const { data, error } = await supabase.functions.invoke('account-delete', {
      body: {},
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    if (data?.deleted !== true) throw new Error('A exclusão não foi confirmada pelo servidor.');
    return data;
  },
};
