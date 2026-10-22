import { test as base } from "@playwright/test";

import FlightFinderPage from "../pages/flight-finder.page";

export const test = base.extend<{
  premiumSearchUi: void;
}>({
  premiumSearchUi: [
    async ({ page }, use) => {
      const flightFinder = new FlightFinderPage(page);

      await flightFinder.mockSearchAccess("premium");

      await use();
    },
    { auto: true },
  ],
});
