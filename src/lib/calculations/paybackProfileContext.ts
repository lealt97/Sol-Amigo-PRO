export type ActivePaybackProfiles = {
  monthlyCompensableConsumptionProfileKwh: number[] | null;
  monthlyGenerationProfileKwh: number[] | null;
};

let activeProfiles: ActivePaybackProfiles = {
  monthlyCompensableConsumptionProfileKwh: null,
  monthlyGenerationProfileKwh: null,
};

export function setActivePaybackProfiles(profiles: ActivePaybackProfiles) {
  activeProfiles = {
    monthlyCompensableConsumptionProfileKwh: profiles.monthlyCompensableConsumptionProfileKwh
      ? [...profiles.monthlyCompensableConsumptionProfileKwh]
      : null,
    monthlyGenerationProfileKwh: profiles.monthlyGenerationProfileKwh
      ? [...profiles.monthlyGenerationProfileKwh]
      : null,
  };
}

export function getActivePaybackProfiles(): ActivePaybackProfiles {
  return activeProfiles;
}
