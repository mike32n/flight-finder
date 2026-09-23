import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import MainPage from "../pages/main.page";

test.describe("Flight Finder UI", () => {
  let main: MainPage;
  let common: CommonPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);
    common = new CommonPage(page);

    await page.goto(Env.test);
  });

  test("should display page title", async () => {
    await main.expectPageTitle("Perfect");
  });

  test("should display page elements", async () => {
    await common.expectVisible(main.heading);
    await common.expectVisible(main.airportInput);
    await common.expectVisible(main.weekdaySelect);
    await common.expectVisible(main.decrementButton);
    await common.expectVisible(main.incrementButton);
    await common.expectVisible(main.nightsInput);
    await common.expectVisible(main.searchButton);
    await common.expectVisible(main.toggleThemeButton);
  });
});
