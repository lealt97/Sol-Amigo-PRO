export type DistributedGenerationRegime =
  | 'gd1_grandfathered'
  | 'gd2_transition'
  | 'gd3_special';

export type DistributedGenerationIncidence = {
  fioBPercent: number;
  fioAPercent: number;
  sectorChargesPercent: number;
  isPostTransitionAssumption: boolean;
};

export type DistributedGenerationChargeInput = {
  regime: DistributedGenerationRegime;
  calendarYear: number;
  gridCompensatedEnergyKwh: number;
  tariffEscalationFactor: number;
  fioBTariffCentsPerKwh: number;
  fioATariffCentsPerKwh: number;
  sectorChargesCentsPerKwh: number;
  postTransitionFioBPercent: number;
  postTransitionFioAPercent: number;
  postTransitionSectorChargesPercent: number;
};

export type DistributedGenerationChargeResult = DistributedGenerationIncidence & {
  fioBCharge: number;
  fioACharge: number;
  sectorCharges: number;
  totalCharge: number;
};

export const GD2_FIO_B_TRANSITION_PERCENT: Readonly<Record<number, number>> = Object.freeze({
  2023: 15,
  2024: 30,
  2025: 45,
  2026: 60,
  2027: 75,
  2028: 90,
});

export function resolveDistributedGenerationIncidence(
  regime: DistributedGenerationRegime,
  calendarYear: number,
  postTransition: Pick<
    DistributedGenerationChargeInput,
    'postTransitionFioBPercent' | 'postTransitionFioAPercent' | 'postTransitionSectorChargesPercent'
  >,
): DistributedGenerationIncidence {
  if (regime === 'gd1_grandfathered') {
    if (calendarYear <= 2045) {
      return {
        fioBPercent: 0,
        fioAPercent: 0,
        sectorChargesPercent: 0,
        isPostTransitionAssumption: false,
      };
    }

    return {
      fioBPercent: postTransition.postTransitionFioBPercent,
      fioAPercent: postTransition.postTransitionFioAPercent,
      sectorChargesPercent: postTransition.postTransitionSectorChargesPercent,
      isPostTransitionAssumption: true,
    };
  }

  if (regime === 'gd2_transition') {
    if (calendarYear <= 2022) {
      return {
        fioBPercent: 0,
        fioAPercent: 0,
        sectorChargesPercent: 0,
        isPostTransitionAssumption: false,
      };
    }

    const transitionPercent = GD2_FIO_B_TRANSITION_PERCENT[calendarYear];
    if (transitionPercent != null) {
      return {
        fioBPercent: transitionPercent,
        fioAPercent: 0,
        sectorChargesPercent: 0,
        isPostTransitionAssumption: false,
      };
    }

    return {
      fioBPercent: postTransition.postTransitionFioBPercent,
      fioAPercent: postTransition.postTransitionFioAPercent,
      sectorChargesPercent: postTransition.postTransitionSectorChargesPercent,
      isPostTransitionAssumption: true,
    };
  }

  if (calendarYear <= 2022) {
    return {
      fioBPercent: 0,
      fioAPercent: 0,
      sectorChargesPercent: 0,
      isPostTransitionAssumption: false,
    };
  }

  if (calendarYear <= 2028) {
    return {
      fioBPercent: 100,
      fioAPercent: 40,
      sectorChargesPercent: 100,
      isPostTransitionAssumption: false,
    };
  }

  return {
    fioBPercent: postTransition.postTransitionFioBPercent,
    fioAPercent: postTransition.postTransitionFioAPercent,
    sectorChargesPercent: postTransition.postTransitionSectorChargesPercent,
    isPostTransitionAssumption: true,
  };
}

export function calculateDistributedGenerationCharge(
  input: DistributedGenerationChargeInput,
): DistributedGenerationChargeResult {
  const incidence = resolveDistributedGenerationIncidence(input.regime, input.calendarYear, input);
  const compensatedEnergy = Math.max(0, input.gridCompensatedEnergyKwh);
  const escalationFactor = Math.max(0, input.tariffEscalationFactor);
  const fioBTariffPerKwh = Math.max(0, input.fioBTariffCentsPerKwh) / 100 * escalationFactor;
  const fioATariffPerKwh = Math.max(0, input.fioATariffCentsPerKwh) / 100 * escalationFactor;
  const sectorTariffPerKwh = Math.max(0, input.sectorChargesCentsPerKwh) / 100 * escalationFactor;

  const fioBCharge = compensatedEnergy * fioBTariffPerKwh * incidence.fioBPercent / 100;
  const fioACharge = compensatedEnergy * fioATariffPerKwh * incidence.fioAPercent / 100;
  const sectorCharges = compensatedEnergy * sectorTariffPerKwh * incidence.sectorChargesPercent / 100;

  return {
    ...incidence,
    fioBCharge,
    fioACharge,
    sectorCharges,
    totalCharge: fioBCharge + fioACharge + sectorCharges,
  };
}
