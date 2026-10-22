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

      const label =
        plan === "anonymous"
          ? "Guest"
          : plan === "registered"
            ? "Registered"
            : "Premium";

      await common.expectContainsText(flightFinder.searchAccessStatus, label);

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

      for (const destination of destinations) {
        await flightFinder.selectAirportByEnter(destination);
      }

      await flightFinder.expectSelectedDestinationCount(destinations.length);
      await common.expectDisabled(flightFinder.airportInput);

      await common.expectContainsText(
        flightFinder.searchAccessStatus,
        `Up to ${destinations.length} destination`,
      );
      await common.expectContainsText(
        flightFinder.searchAccessStatus,
        `Smart Flex: ${plan === "anonymous" ? "off" : "on"}`,
      );

      await flightFinder.clickSelectedContainer("AMS");

      await common.expectEnabled(flightFinder.airportInput);
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

    await common.expectContainsText(
      flightFinder.searchAccessStatus,
      "Premium · Up to 2 destinations · Smart Flex: off.",
    );

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

      await common.expectContainsText(
        flightFinder.searchAccessStatus,
        "Search settings could not be loaded.",
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

    await common.expectContainsText(
      flightFinder.searchAccessStatus,
      "Some destinations were removed",
    );

    await flightFinder.expectOriginSelected("BUD");
    await flightFinder.expectSelectedDestinationCount(1);
    await flightFinder.expectAirportSelected("AMS");

    await common.expectValue(flightFinder.weekdaySelect, "6");
    await common.expectValue(flightFinder.nightsInput, "1");
    await common.expectValue(flightFinder.startDateInput, "2026-10-21");

    await common.reloadPage();

    await common.expectContainsText(flightFinder.searchAccessStatus, "Guest");
    await flightFinder.expectSelectedDestinationCount(1);
    await flightFinder.expectAirportSelected("AMS");
  });

  test("TC-SEARCH-ACCESS-05 | should refresh permissions after login and logout", async () => {
    await flightFinder.mockSearchSession("premium");
    await common.openPage(Env.test);

    await common.expectContainsText(flightFinder.searchAccessStatus, "Guest");

    await flightFinder.selectAirportByEnter("ams");
    await common.expectDisabled(flightFinder.airportInput);

    await common.click(auth.loginButton);
    await auth.fillLoginForm("search@example.com", "TestPassword1");
    await common.click(auth.loginSubmitButton);

    await common.expectContainsText(flightFinder.searchAccessStatus, "Premium");

    await common.expectEnabled(flightFinder.originInput);
    await common.expectEnabled(flightFinder.weekdaySelect);
    await common.expectEnabled(flightFinder.nightsInput);
    await common.expectEnabled(flightFinder.startDateInput);
    await common.expectEnabled(flightFinder.airportInput);

    await flightFinder.selectAirportByEnter("bcn");
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.expectSelectedDestinationCount(3);

    await common.click(flightFinder.logoutButton);

    await common.expectContainsText(flightFinder.searchAccessStatus, "Guest");

    await flightFinder.expectSelectedDestinationCount(1);
    await common.expectDisabled(flightFinder.originInput);
    await common.expectDisabled(flightFinder.weekdaySelect);
    await common.expectDisabled(flightFinder.nightsInput);
    await common.expectDisabled(flightFinder.startDateInput);
    await common.expectDisabled(flightFinder.airportInput);
  });
});
