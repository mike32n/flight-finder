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

  test("TC-FLIGHT-01 | should toggle dark theme", async () => {
    await flightFinder.clickToggleTheme();

    await common.expectDarkThemeIsActive();
  });

  test("TC-FLIGHT-02 | should select active autocomplete item", async () => {
    await flightFinder.openAutocomplete("c");
    await flightFinder.pressArrowDown(flightFinder.airportInput, 2);

    const iata = await flightFinder.getActiveAutocompleteItemIata();

    await flightFinder.pressEnter();

    await flightFinder.expectAirportSelected(iata);
  });

  test("TC-FLIGHT-03 | should select multiple airports", async () => {
    await flightFinder.selectAirportByEnter("ein");
    await flightFinder.expectAirportSelected("EIN");

    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.expectAirportSelected("LCA");

    await flightFinder.selectAirportByEnter("tf");
    await flightFinder.expectAirportSelected("TFS");
  });

  test("TC-FLIGHT-04 | should deselect airport", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.clickSelectedContainer("AMS");
    await flightFinder.expectAirportNotSelected("AMS");
  });

  test("TC-FLIGHT-05 | should not select the same airport more than once", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelectedOnlyOnce("AMS");
  });

  test("TC-FLIGHT-06 | should warn if no airports are selected", async () => {
    await flightFinder.clickSearchButton();

    await flightFinder.expectNoAirportsSelectedWarning();
  });

  test("TC-FLIGHT-07 | should select weekday by typing", async () => {
    await flightFinder.selectWeekdayByName("Friday");

    await flightFinder.expectWeekdaySelected("Friday");
  });

  test("TC-FLIGHT-08 | should navigate weekdays with arrow keys", async () => {
    await flightFinder.selectWeekdayByName("Friday");
    await flightFinder.pressArrowDown(flightFinder.weekdaySelect);
    await flightFinder.expectWeekdaySelected("Saturday");

    await flightFinder.pressArrowUp(flightFinder.weekdaySelect, 2);
    await flightFinder.expectWeekdaySelected("Thursday");
  });

  test("TC-FLIGHT-09 | should not decrement nights below minimum", async () => {
    await flightFinder.clickDecrementButton(1);

    await flightFinder.expectNightsValue("1");
  });

  test("TC-FLIGHT-10 | should not increment nights above maximum", async () => {
    await flightFinder.clickIncrementButton(30);

    await flightFinder.expectNightsValue("30");
  });

  test("TC-FLIGHT-11 | should increment and decrement nights", async () => {
    await flightFinder.clickIncrementButton(3);
    await flightFinder.expectNightsValue("4");

    await flightFinder.clickDecrementButton();
    await flightFinder.expectNightsValue("3");
  });

  test("TC-FLIGHT-12 | should complete search for one airport", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectWeekdayOption("5");
    await flightFinder.clickIncrementButton(2);

    await flightFinder.clickSearchButton();

    await flightFinder.expectFirstResultVisible();
    await flightFinder.expectResultsFooterText("Finished");
  });

  test("TC-FLIGHT-13 | should show price insight for flexible date results", async () => {
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.selectAirportByEnter("pmi");
    await flightFinder.selectAirportByEnter("cfu");

    await flightFinder.selectWeekdayOption("5");
    await flightFinder.clickIncrementButton();

    await flightFinder.clickSearchButton();

    await flightFinder.expectResultsFooterText("Finished");
    await flightFinder.expectFlexibleDateResult();
  });

  test("TC-FLIGHT-14 | should show alternative dates for fallback flex results", async () => {
    await flightFinder.mockFallbackFlexSearch();

    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.clickSearchButton();

    await flightFinder.expectAlternativeDateResult();
  });

  test("TC-FLIGHT-15 | should show no-results state when search returns no flights", async () => {
    await flightFinder.mockEmptySearch();

    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.clickSearchButton();

    await flightFinder.expectNoResults();
    await flightFinder.expectResultsFooterText("Finished");
  });

  test("TC-FLIGHT-16 | should remain usable when config request fails", async () => {
    await flightFinder.mockConfigFailure();

    await common.reloadPage();

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.selectAirportByEnter("ein");

    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.expectAirportSelected("LCA");
    await flightFinder.expectAirportSelected("EIN");
    await flightFinder.expectAirportInputDisabled();

    await flightFinder.clickIncrementButton(30);
    await flightFinder.expectNightsValue("30");
  });

  test("TC-FLIGHT-17 | should handle unexpected search stream close", async () => {
    await flightFinder.mockUnexpectedStreamClose();

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.clickSearchButton();

    await flightFinder.expectSearchError("Error occurred.");
  });
});

test.describe("Flight Search Error Handling", () => {
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    flightFinder = new FlightFinderPage(page);

    await page.goto(Env.test);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");
  });

  test("TC-ERROR-01 | should show error when search request fails", async () => {
    await flightFinder.mockSearchServerError();

    await flightFinder.clickSearchButton();

    await flightFinder.expectSearchError("Error occurred.");
  });

  test("TC-ERROR-02 | should show error when search stream fails", async () => {
    await flightFinder.mockSearchStreamError();

    await flightFinder.clickSearchButton();

    await flightFinder.expectSearchError("Error occurred.");
  });
});
