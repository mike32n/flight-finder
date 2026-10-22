export type SearchPlan = "anonymous" | "registered" | "premium";

export interface SearchPolicy {
  canSelectOrigin: boolean;
  maxDestinations: number;
  canSelectWeekday: boolean;
  fixedWeekday: number;
  canSelectNights: boolean;
  fixedNights: number;
  canSelectStartDate: boolean;
  smartFlexEnabled: boolean;
  searchHistoryEnabled: boolean;
  favouritesEnabled: boolean;
  adsEnabled: boolean;
}

export function getSearchAccess(
  plan: SearchPlan,
  overrides: Partial<SearchPolicy> = {},
) {
  const registered = plan !== "anonymous";
  const premium = plan === "premium";

  return {
    success: true,
    plan,
    policy: {
      canSelectOrigin: registered,
      maxDestinations: registered ? 3 : 1,
      canSelectWeekday: premium,
      fixedWeekday: 6,
      canSelectNights: premium,
      fixedNights: 1,
      canSelectStartDate: premium,
      smartFlexEnabled: registered,
      searchHistoryEnabled: registered,
      favouritesEnabled: registered,
      adsEnabled: !premium,
      ...overrides,
    },
  };
}
