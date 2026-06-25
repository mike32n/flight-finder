import { expect, test } from "@playwright/test";

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

  test("should display page elements", async() => {
    await main.expectVisible(main.heading);
    await main.expectVisible(main.airportInput);
    await main.expectVisible(main.weekdaySelect);
    await main.expectVisible(main.decrementButton);
    await main.expectVisible(main.incrementButton);
    await main.expectVisible(main.nightsInput);
    await main.expectVisible(main.searchButton);
    await main.expectVisible(main.toggleThemeButton);
  })
});
