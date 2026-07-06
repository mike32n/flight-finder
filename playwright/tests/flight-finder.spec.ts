import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import MainPage from "../pages/main.page";

test.describe("Flight Finder", () => {
  let main: MainPage;
  let common: CommonPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);
    common = new CommonPage(page);

    await page.goto(Env.test);
  });

  test("should toggle dark theme", async () => {
    await main.clickToggleTheme();

    await common.expectDarkThemeIsActive();
  });

  test("should select active list item", async () => {
    const iata = await main.selectAirportWithArrowKeys("c", 1, 3, 1);

    await main.expectAirportSelected(iata);
  });

  test("should select multiple airports", async () => {
    await main.selectAirportByEnter("ein");
    await main.expectAirportSelected("EIN");

    await main.selectAirportByEnter("lca");
    await main.expectAirportSelected("LCA");

    await main.selectAirportByEnter("tf");
    await main.expectAirportSelected("TFS");
  });
});
