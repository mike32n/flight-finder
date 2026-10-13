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

  test("TC-UI-01 | should display page title", async () => {
    await flightFinder.expectPageTitle(
      "Flight Finder | Perfect Weekend Getaways",
    );
  });

  test("TC-UI-02 | should display main page elements", async () => {
    await flightFinder.expectMainPageElementsVisible();
  });
});
