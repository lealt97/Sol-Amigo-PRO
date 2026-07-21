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

async function resolveFunctionError(error: unknown, fallback: string) {
  const defaultMessage = error instanceof Error && error.message ? error.message : fallback;

  if (!error || typeof error !== 'object' || !('context' in error)) {
    return defaultMessage;
  }

  const context = (error as { context?: Response }).context;
  if (!context || typeof context.clone !== 'function') {
    return defaultMessage;
  }

  try {
    const payload = await context.clone().json() as { error?: unknown };
    if (payload?.error) return String(payload.error);
  } catch {
    // A resposta pode não ser JSON. Nesse caso, preservamos a mensagem original.
  }

  return defaultMessage;
}

export const accountDataService = {
  async exportAccountData() {
    const { data, error } = await supabase.functions.invoke('account-data-export', {
      body: {},
    });
    if (error) throw new Error(await resolveFunctionError(error, 'Não foi possível exportar seus dados.'));
    if (data?.error) throw new Error(String(data.error));

    const date = new Date().toISOString().slice(0, 10);
    createDownload(data, `solamigo-export-${date}.json`);
    return data;
  },

  async deleteAccount(accessToken: string) {
    if (!accessToken) {
      throw new Error('A confirmação recente da senha não foi encontrada. Entre novamente e repita a exclusão.');
    }

    const { data, error } = await supabase.functions.invoke('account-delete', {
      body: {},
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) throw new Error(await resolveFunctionError(error, 'Não foi possível excluir a conta.'));
    if (data?.error) throw new Error(String(data.error));
    if (data?.deleted !== true) throw new Error('A exclusão não foi confirmada pelo servidor.');
    return data;
  },
};