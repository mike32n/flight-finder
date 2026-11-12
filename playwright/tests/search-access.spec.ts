import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";

test.describe("Search access", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);

    await common.installClock("2026-10-21T12:00:00");
  });

  for (const plan of ["anonymous", "registered", "premium"] as const) {
    test(`TC-SEARCH-ACCESS-01-${plan.toUpperCase()} | should apply plan permissions and destination limit`, async () => {
      await flightFinder.mockSearchAccess(plan);
      await common.openPage(Env.test);

      await flightFinder.expectSearchAccessStatusHidden();
      await flightFinder.expectPremiumBadge(plan === "premium");
      await common.expectNotPresent(flightFinder.searchValidationError);

      if (plan === "anonymous") {
        await common.expectDisabled(flightFinder.originInput);
      } else {
        await common.expectEnabled(flightFinder.originInput);
      }

      if (plan === "premium") {
        await common.expectEnabled(flightFinder.weekdaySelect);
        await common.expectEnabled(flightFinder.nightsInput);
        await common.expectEnabled(flightFinder.incrementButton);
        await common.expectEnabled(flightFinder.decrementButton);
        await common.expectEnabled(flightFinder.startDateInput);
      } else {
        await common.expectDisabled(flightFinder.weekdaySelect);
        await common.expectDisabled(flightFinder.nightsInput);
        await common.expectDisabled(flightFinder.incrementButton);
        await common.expectDisabled(flightFinder.decrementButton);
        await common.expectDisabled(flightFinder.startDateInput);

        await common.expectValue(flightFinder.weekdaySelect, "6");
        await common.expectValue(flightFinder.nightsInput, "1");
        await common.expectValue(flightFinder.startDateInput, "2026-10-21");
      }

      const destinations =
        plan === "anonymous" ? ["ams"] : ["ams", "lca", "bcn"];

      await flightFinder.expectDestinationPlaceholder(
        `Type city or IATA code (${destinations.length} left)`,
      );
      for (const [index, destination] of destinations.entries()) {
        await flightFinder.selectAirportByEnter(destination);
        const remaining = destinations.length - index - 1;
        await flightFinder.expectDestinationPlaceholder(
          remaining
            ? `Type city or IATA code (${remaining} left)`
            : "Max selected",
        );
      }

      await flightFinder.expectSelectedDestinationCount(destinations.length);
      await common.expectNotPresent(flightFinder.searchValidationError);
      await common.expectDisabled(flightFinder.airportInput);

      await flightFinder.clickSelectedContainer("AMS");

      await common.expectEnabled(flightFinder.airportInput);
      await flightFinder.expectDestinationPlaceholder(
        "Type city or IATA code (1 left)",
      );
    });
  }

  test("TC-SEARCH-ACCESS-02 | should apply custom policy values instead of hardcoded plan permissions", async () => {
    await flightFinder.mockSearchAccess("premium", {
      canSelectOrigin: false,
      maxDestinations: 2,
      canSelectWeekday: false,
      fixedWeekday: 4,
      canSelectNights: false,
      fixedNights: 3,
      canSelectStartDate: false,
      smartFlexEnabled: false,
    });

    await common.openPage(Env.test);

    await flightFinder.expectSearchAccessStatusHidden();

    await common.expectDisabled(flightFinder.originInput);
    await common.expectDisabled(flightFinder.weekdaySelect);
    await common.expectDisabled(flightFinder.nightsInput);
    await common.expectDisabled(flightFinder.incrementButton);
    await common.expectDisabled(flightFinder.decrementButton);
    await common.expectDisabled(flightFinder.startDateInput);

    await common.expectValue(flightFinder.weekdaySelect, "4");
    await common.expectValue(flightFinder.nightsInput, "3");

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectAirportByEnter("bcn");

    await common.expectDisabled(flightFinder.airportInput);
  });

  for (const status of [500, 200]) {
    test(`TC-SEARCH-ACCESS-03-${status} | should disable searching when access loading fails or returns invalid data`, async () => {
      await flightFinder.mockSearchAccessResponse(status, {});
      await common.openPage(Env.test);

      await flightFinder.expectSearchAccessStatusMessage(
        "Search settings could not be loaded.",
      );
      await flightFinder.expectPremiumBadge(false);
      await flightFinder.expectDestinationPlaceholder(
        "Type city or IATA code...",
      );

      await common.expectDisabled(flightFinder.searchButton);
      await common.expectDisabled(flightFinder.originInput);
      await common.expectDisabled(flightFinder.airportInput);
      await common.expectDisabled(flightFinder.weekdaySelect);
      await common.expectDisabled(flightFinder.nightsInput);
      await common.expectDisabled(flightFinder.startDateInput);
    });
  }

  test("TC-SEARCH-ACCESS-04 | should normalize restored settings to the current policy", async () => {
    await flightFinder.mockSearchAccess("premium");
    await common.openPage(Env.test);

    await flightFinder.selectOrigin("VIE");

    await flightFinder.selectAirportByEnter("bud");
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectAirportByEnter("bcn");

    await flightFinder.selectWeekdayOption("2");
    await common.fill(flightFinder.nightsInput, "3");
    await common.fill(flightFinder.startDateInput, "2027-03-01");
    await common.press(flightFinder.startDateInput, "Tab");

    await flightFinder.mockSearchAccess("anonymous");
    await common.reloadPage();

    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectClearedDestinationWarning();

    await flightFinder.expectOriginSelected("BUD");
    await flightFinder.expectSelectedDestinationCount(0);
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (1 left)",
    );
    await flightFinder.expectErrorCardLayoutAtWidth(320);
    await flightFinder.expectErrorCardLayoutAtWidth(360);
    await common.click(flightFinder.searchValidationError);
    await common.expectNotPresent(flightFinder.searchValidationError);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectSelectedDestinationCount(0);

    await common.expectValue(flightFinder.weekdaySelect, "6");
    await common.expectValue(flightFinder.nightsInput, "1");
    await common.expectValue(flightFinder.startDateInput, "2026-10-21");

    await common.reloadPage();

    await flightFinder.expectSearchAccessStatusHidden();
    await common.expectNotPresent(flightFinder.searchValidationError);
    await flightFinder.expectSelectedDestinationCount(0);
  });

  test("TC-SEARCH-ACCESS-05 | should refresh permissions after login and logout", async () => {
    await flightFinder.mockSearchSession("premium");
    await common.openPage(Env.test);

    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectPremiumBadge(false);
    await flightFinder.expectHeaderLayoutAtWidth(390);

    await flightFinder.selectAirportByEnter("ams");
    await common.expectDisabled(flightFinder.airportInput);

    await common.click(auth.loginButton);
    await auth.fillLoginForm("search@example.com", "TestPassword1");
    await common.click(auth.loginSubmitButton);

    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectPremiumBadge(true);
    await flightFinder.expectSearchAccessStatusHidden();

    await common.expectEnabled(flightFinder.originInput);
    await common.expectEnabled(flightFinder.weekdaySelect);
    await common.expectEnabled(flightFinder.nightsInput);
    await common.expectEnabled(flightFinder.startDateInput);
    await common.expectEnabled(flightFinder.airportInput);

    await flightFinder.selectAirportByEnter("bcn");
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.expectSelectedDestinationCount(3);

    await common.click(flightFinder.logoutButton);

    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectPremiumBadge(false);
    await flightFinder.expectClearedDestinationWarning();

    await flightFinder.expectSelectedDestinationCount(0);
    await common.click(flightFinder.searchValidationError);
    await common.expectNotPresent(flightFinder.searchValidationError);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectSelectedDestinationCount(0);
    await common.expectDisabled(flightFinder.originInput);
    await common.expectDisabled(flightFinder.weekdaySelect);
    await common.expectDisabled(flightFinder.nightsInput);
    await common.expectDisabled(flightFinder.startDateInput);
    await common.expectEnabled(flightFinder.airportInput);
  });

  test("TC-SEARCH-ACCESS-06 | should center Smart Flex and fit operational header feedback", async () => {
    await flightFinder.mockSearchAccess("premium");
    await common.openPage(Env.test);

    for (const width of [320, 360, 390, 768, 1280]) {
      await flightFinder.expectHeaderLayoutAtWidth(width);
    }

    const shortStatusLayout = await flightFinder.expectHeaderLayoutAtWidth(320);
    await flightFinder.expectHeaderLayoutAtWidth(
      320,
      "Search settings could not be loaded. Please reload the page to try again.",
    );
    await flightFinder.expectHeaderControlsMatch(shortStatusLayout);
  });

  test("TC-SEARCH-ACCESS-07 | should update the badge on access refresh and fit narrow headings", async () => {
    await flightFinder.mockSearchAccess("premium");
    await common.openPage(Env.test);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectPremiumBadge(true);

    for (const width of [320, 360, 390, 1280]) {
      await flightFinder.expectPremiumHeadingLayoutAtWidth(width);
    }

    for (const plan of [
      "registered",
      "premium",
      "anonymous",
      "premium",
    ] as const) {
      await flightFinder.mockSearchAccess(plan);
      await flightFinder.refreshSearchAccess();
      await flightFinder.expectSearchAccessStatusHidden();
      await flightFinder.expectPremiumBadge(plan === "premium");
    }

    await flightFinder.mockSearchAccessResponse(500, {});
    await flightFinder.refreshSearchAccess();
    await flightFinder.expectSearchAccessStatusMessage(
      "Search settings could not be loaded.",
    );
    await flightFinder.expectPremiumBadge(false);
  });

  test("TC-SEARCH-ACCESS-08 | should update remaining destinations after policy refresh", async () => {
    await flightFinder.mockSearchAccess("premium");
    await common.openPage(Env.test);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (2 left)",
    );

    const held = await flightFinder.holdSearchAccess("premium", {
      maxDestinations: 2,
    });
    try {
      await flightFinder.refreshSearchAccess();
      await held.waitUntilRequested();
      await flightFinder.expectDestinationPlaceholder(
        "Type city or IATA code...",
      );
      await flightFinder.expectSearchAccessStatusMessage(
        "Loading search settings...",
      );
    } finally {
      held.release();
    }

    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (1 left)",
    );

    await flightFinder.selectAirportByEnter("bcn");
    await flightFinder.expectDestinationPlaceholder("Max selected");
    await flightFinder.mockSearchAccess("premium", { maxDestinations: 3 });
    await flightFinder.refreshSearchAccess();
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (1 left)",
    );

    await flightFinder.mockSearchAccessResponse(500, {});
    await flightFinder.refreshSearchAccess();
    await flightFinder.expectSearchAccessStatusMessage(
      "Search settings could not be loaded.",
    );
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code...",
    );
  });
});
