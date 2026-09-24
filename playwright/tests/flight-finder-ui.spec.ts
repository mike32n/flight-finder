import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Flight Finder UI", () => {
  let flightFinder: FlightFinderPage;
  let common: CommonPage;

  test.beforeEach(async ({ page }) => {
    flightFinder = new FlightFinderPage(page);
    common = new CommonPage(page);

    await page.goto(Env.test);
  });

  test("should display page title", async () => {
    await flightFinder.expectPageTitle("Perfect");
  });

  test("should display page elements", async () => {
    await common.expectVisible(flightFinder.heading);
    await common.expectVisible(flightFinder.airportInput);
    await common.expectVisible(flightFinder.weekdaySelect);
    await common.expectVisible(flightFinder.decrementButton);
    await common.expectVisible(flightFinder.incrementButton);
    await common.expectVisible(flightFinder.nightsInput);
    await common.expectVisible(flightFinder.searchButton);
    await common.expectVisible(flightFinder.toggleThemeButton);
  });
});
