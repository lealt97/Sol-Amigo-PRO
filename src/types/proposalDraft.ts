import type { ElectricalStandardId } from '../lib/calculations/electricalStandards';
import type {
  PaybackStatus,
  RegulatoryFramework,
  TariffTaxMode,
} from '../lib/calculations/payback';

export const PROPOSAL_DRAFT_VERSION = 1 as const;

export type ProposalDraftConsumptionMode = 'history' | 'average' | 'loads';
export type ProposalDraftConnectionType = 'monophase' | 'biphase' | 'triphase';

export type ProposalDraftLoad = {
  id: string;
  equipmentName: string;
  powerWatts: string;
  quantity: string;
  hoursPerDay: string;
  daysPerWeek: string;
};

export type ProposalDraftAdditionalCost = {
  id: string;
  description: string;
  amount: string;
};

export type ProposalDraftPaybackCalculationSnapshot = {
  calculationVersion: number;
  monthlySavings: number;
  annualSavings: number;
  firstYearNetCashFlow: number;
  paybackYears: number | null;
  paybackMonths: number | null;
  discountedPaybackYears: number | null;
  discountedPaybackMonths: number | null;
  netPresentValue: number;
  internalRateOfReturnPercent: number | null;
  projectedGrossSavings: number;
  projectedNetSavings: number;
  projectionYears: number;
  effectiveTariffPerKwh: number;
  regulatoryFramework: RegulatoryFramework;
  status: PaybackStatus;
  statusLabel: string;
};

export type ProposalDraftPaybackForm = {
  tariffCentsPerKwh: string;
  tariffTaxMode?: TariffTaxMode;
  averageMonthlyBillAmount?: string;
  pisPercent: string;
  cofinsPercent: string;
  icmsPercent: string;
  otherTariffsPercent: string;
  marginPercentage: string;
  regulatoryFramework?: RegulatoryFramework;
  projectionStartYear?: string;
  fioBComponentsCentsPerKwh?: string;
  customRegulatoryChargePercent?: string;
  postTransitionChargePercent?: string;
  selfConsumptionPercent?: string;
  annualTariffEscalationPercent?: string;
  annualDegradationPercent?: string;
  annualMaintenancePercent?: string;
  annualDiscountRatePercent?: string;
  inverterReplacementYear?: string;
  inverterReplacementCost?: string;
  projectionYears?: string;
  additionalCosts: ProposalDraftAdditionalCost[];
  calculationSnapshot?: ProposalDraftPaybackCalculationSnapshot;
};

export type ProposalDraftStateV1 = {
  version: typeof PROPOSAL_DRAFT_VERSION;
  currentStep: number;
  proposalTitle?: string;
  selectedClientId: string;
  consumptionMode: ProposalDraftConsumptionMode;
  directAverageConsumption: string;
  monthlyConsumption: string[];
  loadSurvey: ProposalDraftLoad[];
  connectionType: ProposalDraftConnectionType;
  gridVoltageV?: string;
  electricalStandardId?: ElectricalStandardId;
  hspDaily: string;
  performanceRatioPercent: string;
  generationIncreasePercent: string;
  modulePowerW: string;
  moduleWidthM: string;
  moduleHeightM: string;
  roofAreaM2: string;
  roofPhotoReference: string | null;
  selectedKitId: string;
  paybackForm: ProposalDraftPaybackForm | null;
};

export type ProposalDraftState = ProposalDraftStateV1;

export function isProposalDraftState(value: unknown): value is ProposalDraftState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProposalDraftState>;
  return candidate.version === PROPOSAL_DRAFT_VERSION
    && Number.isInteger(candidate.currentStep)
    && typeof candidate.selectedClientId === 'string'
    && Array.isArray(candidate.monthlyConsumption)
    && Array.isArray(candidate.loadSurvey);
}
