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

  test("should deselect airport", async () => {
    const iata = await main.selectAirportWithArrowKeys("e", 9, 10, 0);

    await main.expectAirportSelected(iata);
    await main.clickSelectedContainer(iata);
    await main.expectAirportNotSelected(iata);
  });

  test("should select airport only once", async () => {
    await main.selectAirportByEnter("ams");
    await main.expectAirportSelected("AMS");

    await main.selectAirportByEnter("ams");
    await main.expectAirportSelectedOnlyOnce("AMS");
  });

  test("e2e | one airport", async () => {
    await main.selectAirportByEnter("ams");
    await main.expectAirportSelected("AMS");

    await main.selectWeekdayOption("5");
    await main.clickIncrementButton(2);
    await main.clickSearchButton();
    await main.expectResultsFooterText("Finished");
  });
});
