import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Flight Finder", () => {
  let flightFinder: FlightFinderPage;
  let common: CommonPage;

  test.beforeEach(async ({ page }) => {
    flightFinder = new FlightFinderPage(page);
    common = new CommonPage(page);

    await page.goto(Env.test);
  });

  test("should toggle dark theme", async () => {
    await flightFinder.clickToggleTheme();

    await common.expectDarkThemeIsActive();
  });

  test("should select active list item", async () => {
    const iata = await flightFinder.selectAirportWithArrowKeys("c", 1, 3, 1);

    await flightFinder.expectAirportSelected(iata);
  });

  test("should select multiple airports", async () => {
    await flightFinder.selectAirportByEnter("ein");
    await flightFinder.expectAirportSelected("EIN");

    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.expectAirportSelected("LCA");

    await flightFinder.selectAirportByEnter("tf");
    await flightFinder.expectAirportSelected("TFS");
  });

  test("should deselect airport", async () => {
    const iata = await flightFinder.selectAirportWithArrowKeys("e", 9, 10, 0);

    await flightFinder.expectAirportSelected(iata);
    await flightFinder.clickSelectedContainer(iata);
    await flightFinder.expectAirportNotSelected(iata);
  });

  test("should select airport only once", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelectedOnlyOnce("AMS");
  });

  test("should warn if no airports are selected", async () => {
    await flightFinder.clickSearchButton();
    await flightFinder.expectNoAirportsSelectedWarning();
  });

  test("should select weekday by typing", async () => {
    await flightFinder.selectWeekdayByName("Friday");
    await flightFinder.expectWeekdaySelected("Friday");
  });

  test("should select weekday by typing and arrows", async () => {
    await flightFinder.selectWeekdayByName("Friday");
    await flightFinder.pressArrowDown(flightFinder.weekdaySelect);
    await flightFinder.expectWeekdaySelected("Saturday");
    await flightFinder.pressArrowUp(flightFinder.weekdaySelect, 2);
    await flightFinder.expectWeekdaySelected("Thursday");
  });

  test("should not decrement nights when already at minimum", async () => {
    await flightFinder.clickDecrementButton(1);
    await flightFinder.expectNightsValue("1");
  });

  test("should not increment nights when already at maximum", async () => {
    await flightFinder.clickIncrementButton(30);
    await flightFinder.expectNightsValue("30");
  });

  test("should increment and decrement nights", async () => {
    await flightFinder.clickIncrementButton(3);
    await flightFinder.expectNightsValue("4");
    await flightFinder.clickDecrementButton(1);
    await flightFinder.expectNightsValue("3");
  });

  test("e2e | one airport", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectWeekdayOption("5");
    await flightFinder.clickIncrementButton(2);
    await flightFinder.clickSearchButton();
    await flightFinder.expectResultsFooterText("Finished");
  });
});
