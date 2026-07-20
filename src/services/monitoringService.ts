import { supabase } from '../lib/supabase/client';

export type ApplicationEventType =
  | 'pdf.generation_failed'
  | 'checkout.failed'
  | 'storage.asset_failed'
  | 'client.unhandled_error';

export type ApplicationEventSeverity = 'warning' | 'error' | 'critical';

function toErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as { code?: unknown; name?: unknown };
    if (typeof candidate.code === 'string') return candidate.code.slice(0, 120);
    if (typeof candidate.name === 'string') return candidate.name.slice(0, 120);
  }
  return 'unknown_error';
}

export const monitoringService = {
  async capture(
    eventType: ApplicationEventType,
    input: {
      error?: unknown;
      severity?: ApplicationEventSeverity;
      fingerprint?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    try {
      await supabase.functions.invoke('application-monitor', {
        body: {
          eventType,
          severity: input.severity || 'error',
          fingerprint: input.fingerprint || `${eventType}:${toErrorCode(input.error)}`,
          metadata: {
            error_code: toErrorCode(input.error),
            ...(input.metadata || {}),
          },
        },
      });
    } catch (monitoringError) {
      console.warn('Falha ao enviar evento de monitoramento.', monitoringError);
    }
  },
};
