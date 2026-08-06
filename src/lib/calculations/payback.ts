export * from './paybackEngineCreditBank';

import {
  calculatePayback as calculatePaybackWithCreditBank,
  type PaybackInput,
  type PaybackResult,
} from './paybackEngineCreditBank';
import { getActivePaybackProfiles } from './paybackProfileContext';

export function calculatePayback(input: PaybackInput): PaybackResult {
  const activeProfiles = getActivePaybackProfiles();
  return calculatePaybackWithCreditBank({
    ...input,
    monthlyCompensableConsumptionProfileKwh:
      input.monthlyCompensableConsumptionProfileKwh
      ?? activeProfiles.monthlyCompensableConsumptionProfileKwh,
    monthlyGenerationProfileKwh:
      input.monthlyGenerationProfileKwh
      ?? activeProfiles.monthlyGenerationProfileKwh,
  });
}
