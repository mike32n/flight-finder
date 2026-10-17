import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Flight Finder", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.openPage(Env.test);
  });

  test("TC-FLIGHT-01 | should toggle theme icons and preserve theme after reload", async () => {
    await common.expectLightThemeIsActive();
    await common.expectText(flightFinder.toggleThemeButton, "🌙");

    await common.click(flightFinder.toggleThemeButton);

    await common.expectDarkThemeIsActive();
    await common.expectText(flightFinder.toggleThemeButton, "☀️");

    await common.reloadPage();

    await common.expectDarkThemeIsActive();
    await common.expectText(flightFinder.toggleThemeButton, "☀️");

    await common.click(flightFinder.toggleThemeButton);

    await common.expectLightThemeIsActive();
    await common.expectText(flightFinder.toggleThemeButton, "🌙");
  });

  test("TC-FLIGHT-02 | should select active autocomplete item", async () => {
    await flightFinder.openAutocomplete("c");

    await common.press(flightFinder.airportInput, "ArrowDown", 2);
    await flightFinder.expectItemActive(1);

    const iata = await flightFinder.getActiveAutocompleteItemIata();

    await common.press(flightFinder.airportInput, "Enter");

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

  test("TC-FLIGHT-06 | should dismiss the missing-destination warning on click", async () => {
    await common.click(flightFinder.searchButton);

    await common.expectVisible(flightFinder.noAirportsSelectedWarning);
    await common.expectText(
      flightFinder.searchValidationError,
      "⚠️ Please select destination airport(s)",
    );

    await common.click(flightFinder.searchValidationError);

    await common.expectHidden(flightFinder.searchValidationError);
    await flightFinder.expectSelectedDestinationCount(0);
    await common.expectEnabled(flightFinder.airportInput);
    await common.expectEnabled(flightFinder.searchButton);
  });

  test("TC-FLIGHT-07 | should select weekday by typing", async () => {
    await flightFinder.selectWeekdayByName("Friday");

    await common.expectText(flightFinder.selectedWeekdayOption, "Friday");
  });

  test("TC-FLIGHT-08 | should navigate weekdays with arrow keys", async () => {
    await flightFinder.selectWeekdayByName("Friday");
    await common.press(flightFinder.weekdaySelect, "ArrowDown", 1);
    await common.expectText(flightFinder.selectedWeekdayOption, "Saturday");

    await common.press(flightFinder.weekdaySelect, "ArrowUp", 2);
    await common.expectText(flightFinder.selectedWeekdayOption, "Thursday");
  });

  test("TC-FLIGHT-09 | should not decrement nights below minimum", async () => {
    await common.click(flightFinder.decrementButton, 1);

    await common.expectValue(flightFinder.nightsInput, "1");
  });

  test("TC-FLIGHT-10 | should not increment nights above maximum", async () => {
    await common.click(flightFinder.incrementButton, 30);

    await common.expectValue(flightFinder.nightsInput, "30");
  });

  test("TC-FLIGHT-11 | should increment and decrement nights", async () => {
    await common.click(flightFinder.incrementButton, 3);
    await common.expectValue(flightFinder.nightsInput, "4");

    await common.click(flightFinder.decrementButton);
    await common.expectValue(flightFinder.nightsInput, "3");
  });

  test("TC-FLIGHT-12 | should complete search for one airport", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectWeekdayOption("5");
    await common.click(flightFinder.incrementButton, 2);

    await common.click(flightFinder.searchButton);

    await common.expectVisible(flightFinder.firstResult);
    await flightFinder.expectResultsFooterText("Finished");
  });

  test("TC-FLIGHT-13 | should show price insight for flexible date results", async () => {
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.selectAirportByEnter("pmi");
    await flightFinder.selectAirportByEnter("cfu");

    await flightFinder.selectWeekdayOption("5");
    await common.click(flightFinder.incrementButton);

    await common.click(flightFinder.searchButton);

    await flightFinder.expectResultsFooterText("Finished");
    await flightFinder.expectFlexibleDateResult();
  });

  test("TC-FLIGHT-14 | should show alternative dates for fallback flex results", async () => {
    await flightFinder.mockFallbackFlexSearch();

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

    await flightFinder.expectAlternativeDateResult();
  });

  test("TC-FLIGHT-15 | should show no-results state when search returns no flights", async () => {
    await flightFinder.mockEmptySearch();

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

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
    await common.expectDisabled(flightFinder.airportInput);

    await common.click(flightFinder.incrementButton, 30);
    await common.expectValue(flightFinder.nightsInput, "30");
  });

  test("TC-FLIGHT-17 | should preserve interrupted search results after reload", async () => {
    const searchMock = await flightFinder.mockSearchSequence([
      {
        city: "Amsterdam",
        code: "AMS",
        price: 30000,
        completed: false,
      },
    ]);

    const resultText =
      "BUD → Amsterdam (AMS) 2026-10-09 → 2026-10-11 💶 HUF 30,000";

    const interruptedMessage =
      "Search interrupted. Run a new search to finish. (failed: 0)";

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);

    await flightFinder.expectResultsFooterText(interruptedMessage);
    await common.expectText(flightFinder.resultCards, [resultText]);
    await common.expectEnabled(flightFinder.searchButton);

    await common.reloadPage();
    await flightFinder.expectRestoredSearchVisible();

    await flightFinder.expectResultsFooterText(interruptedMessage);
    await common.expectText(flightFinder.resultCards, [resultText]);
    await common.expectEnabled(flightFinder.searchButton);

    await searchMock.expectRequestCount(1);
  });

  test("TC-FLIGHT-18 | should prevent overlapping searches and unlock after completion", async () => {
    const pendingSearch = await flightFinder.mockPendingSearch();

    await flightFinder.selectAirportByEnter("ams");

    try {
      await flightFinder.triggerSearchTwice();

      await common.expectDisabled(flightFinder.searchButton);
      await pendingSearch.expectRequestCount(1);
    } finally {
      pendingSearch.complete();
    }

    await flightFinder.expectNoResults();
    await common.expectEnabled(flightFinder.searchButton);

    await pendingSearch.expectRequestCount(1);
  });

  const destinationsFailureModes = [
    "http",
    "network",
    "json",
    "shape",
    "entry",
  ] as const;

  for (const mode of destinationsFailureModes) {
    test(`TC-FLIGHT-19-${mode.toUpperCase()} | should preserve other UI initialization when destinations fail: ${mode}`, async () => {
      await flightFinder.mockDestinationsFailure(mode);
      await flightFinder.setStoredDarkTheme();

      await common.reloadPage();

      await flightFinder.expectDestinationsUnavailable();
      await common.expectDarkThemeIsActive();
      await flightFinder.expectAuthControlsVisible();

      await common.fill(flightFinder.nightsInput, "0");
      await common.expectValue(flightFinder.nightsInput, "1");
    });
  }

  test("TC-FLIGHT-20 | should exclude the origin from destination suggestions", async () => {
    await flightFinder.selectOrigin("VIE");
    await flightFinder.expectOriginSelected("VIE");

    await flightFinder.openAutocomplete("v");
    await flightFinder.expectDestinationSuggestionAbsent("VIE");

    await common.press(flightFinder.airportInput, "Enter");

    await flightFinder.expectSelectedDestinationCount(1);
    await flightFinder.expectAirportNotSelected("VIE");
  });

  test("TC-FLIGHT-21 | should restore destination badges when the conflict warning is dismissed", async () => {
    await flightFinder.selectOrigin("BUD");

    await flightFinder.selectAirportByEnter("vie");
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectAirportByEnter("lca");

    await flightFinder.expectSelectedDestinationCount(3);
    await common.expectDisabled(flightFinder.airportInput);
    await flightFinder.openOriginAutocomplete("v");
    await flightFinder.expectOriginSuggestionAbsent("VIE");
    await common.press(flightFinder.originInput, "Escape");

    await flightFinder.forceOriginValue("VIE");
    await common.click(flightFinder.searchButton);

    await common.expectText(
      flightFinder.searchValidationError,
      "Departure and destination airports must differ.",
    );
    await flightFinder.expectSelectedDestinationCount(0);

    await common.click(flightFinder.searchValidationError);

    await common.expectHidden(flightFinder.searchValidationError);
    await flightFinder.expectSelectedDestinationCount(3);
    await flightFinder.expectAirportSelected("VIE");
    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.expectAirportSelected("LCA");
    await common.expectDisabled(flightFinder.airportInput);

    await flightFinder.clickSelectedContainer("VIE");

    await flightFinder.expectAirportNotSelected("VIE");
    await flightFinder.expectSelectedDestinationCount(2);
    await common.expectEnabled(flightFinder.airportInput);
    await flightFinder.openOriginAutocomplete("vie");
    await flightFinder.expectOriginSuggestionVisible("VIE");
    await common.press(flightFinder.originInput, "Escape");

    await flightFinder.selectOrigin("BUD");
    await flightFinder.selectOrigin("VIE");
    await flightFinder.expectOriginSelected("VIE");
  });

  test("TC-FLIGHT-22 | should select an origin from the shared airport list and preserve it after reload", async () => {
    await flightFinder.selectOriginByEnter("Larnaca");
    await flightFinder.expectOriginSelected("LCA");

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.openOriginAutocomplete("a");
    await flightFinder.expectOriginSuggestionAbsent("AMS");
    await common.press(flightFinder.originInput, "Escape");

    await common.reloadPage();

    await flightFinder.expectOriginSelected("LCA");
    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.openOriginAutocomplete("a");
    await flightFinder.expectOriginSuggestionAbsent("AMS");
    await common.press(flightFinder.originInput, "Escape");
  });
  test("TC-FLIGHT-23 | should restore the selected origin when editing is cancelled or abandoned", async () => {
    await flightFinder.selectOrigin("VIE");
    await flightFinder.openOriginAutocomplete("London");
    await common.press(flightFinder.originInput, "Escape");
    await flightFinder.expectOriginSelected("VIE");
    await common.expectHidden(flightFinder.originAutocompleteList);
    await flightFinder.openOriginAutocomplete("London");
    await flightFinder.blurOriginInput();
    await flightFinder.expectOriginSelected("VIE");
    await common.reloadPage();
    await flightFinder.expectOriginSelected("VIE");
  });

  test("TC-FLIGHT-24 | should enable airport controls only after initialization completes", async () => {
    const config = await flightFinder.holdConfigRequest();
    try {
      await common.reloadPage();
      await config.waitUntilRequested();
      await flightFinder.expectAirportControlsDisabled();
    } finally {
      config.release();
    }
    await flightFinder.selectOrigin("LCA");
    await flightFinder.expectOriginSelected("LCA");
    await common.expectEnabled(flightFinder.airportInput);
    await common.expectEnabled(flightFinder.searchButton);
  });

  test("TC-FLIGHT-25 | should select the typed origin when Enter is pressed without waiting for suggestions", async () => {
    await flightFinder.selectOriginImmediatelyByEnter("Larnaca");
    await flightFinder.expectOriginSelected("LCA");
  });
});

test.describe("Flight Search Error Handling", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.openPage(Env.test);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");
  });

  test("TC-ERROR-01 | should show error when search request fails", async () => {
    await flightFinder.mockSearchServerError();

    await common.click(flightFinder.searchButton);

    await common.expectContainsText(flightFinder.results, "Error occurred.");
  });

  test("TC-ERROR-02 | should show error when search stream fails", async () => {
    await flightFinder.mockSearchStreamError();

    await common.click(flightFinder.searchButton);

    await common.expectContainsText(flightFinder.results, "Error occurred.");
  });

  test("TC-ERROR-03 | should request retry when provider failure leaves no results", async () => {
    await flightFinder.mockSearchWithProviderFailure();

    await common.click(flightFinder.searchButton);

    await flightFinder.expectSearchUnavailable();
    await flightFinder.expectResultsFooterText("Finished...(failed: 1)");
    await common.expectEnabled(flightFinder.searchButton);
  });

  test("TC-ERROR-04 | should retain results when another provider request fails", async () => {
    await flightFinder.mockSearchWithProviderFailure(true);

    await common.click(flightFinder.searchButton);

    await common.expectVisible(flightFinder.firstResult);
    await flightFinder.expectResultsFooterText("Finished...(failed: 1)");
    await flightFinder.expectNoSearchUnavailableMessage();
    await common.expectEnabled(flightFinder.searchButton);
  });
});
