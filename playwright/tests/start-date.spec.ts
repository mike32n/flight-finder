import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Search start date", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.installClock("2026-10-15T12:00:00");
    await common.openPage(Env.test);

    await common.expectEnabled(flightFinder.searchButton);
  });

  test("TC-START-DATE-01 | should default to today and prevent earlier calendar dates", async () => {
    await common.expectValue(flightFinder.startDateInput, "2026-10-15");
    await flightFinder.expectStartDateMinimum("2026-10-15");
  });

  test("TC-START-DATE-02 | should send the selected future start date", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Amsterdam",
        code: "AMS",
        price: 30000,
      },
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.fillStartDate("2027-03-01");

    await flightFinder.searchAndExpectStartDate("2027-03-01");

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
  });

  test("TC-START-DATE-03 | should preserve results when the start date is invalid", async () => {
    const searchMock = await flightFinder.mockSearchSequence([
      {
        city: "Amsterdam",
        code: "AMS",
        price: 30000,
      },
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.searchAndExpectStartDate("2026-10-15");

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");

    await flightFinder.fillStartDate("2026-10-14");
    await common.click(flightFinder.searchButton);

    await common.expectText(
      flightFinder.searchValidationError,
      "Start date cannot be in the past.",
    );
    await common.expectVisible(flightFinder.firstResult);

    await flightFinder.fillStartDate("");
    await common.click(flightFinder.searchButton);

    await common.expectText(
      flightFinder.searchValidationError,
      "Please enter a valid start date.",
    );
    await common.expectVisible(flightFinder.firstResult);

    await searchMock.expectRequestCount(1);
  });

  test("TC-START-DATE-04 | should restore the selected future date after reload", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.fillStartDate("2027-03-01");
    await flightFinder.blurStartDate();

    await common.reloadPage();

    await common.expectEnabled(flightFinder.searchButton);
    await common.expectValue(flightFinder.startDateInput, "2027-03-01");
    await flightFinder.expectAirportSelected("AMS");
  });

  test("TC-START-DATE-05 | should restore setup independently of saved result parameters", async () => {
    const searchMock = await flightFinder.mockSearchSequence([
      {
        city: "Amsterdam",
        code: "AMS",
        price: 30000,
      },
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.fillStartDate("2027-03-01");
    await flightFinder.searchAndExpectStartDate("2027-03-01");

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");

    await flightFinder.fillStartDate("2027-04-01");
    await flightFinder.blurStartDate();

    await common.reloadPage();

    await common.expectEnabled(flightFinder.searchButton);
    await common.expectValue(flightFinder.startDateInput, "2027-04-01");
    await flightFinder.expectSavedSearchStartDate("2027-03-01");
    await flightFinder.expectRestoredSearchVisible();
    await common.expectVisible(flightFinder.firstResult);

    await searchMock.expectRequestCount(1);
  });

  test("TC-START-DATE-06 | should replace a saved past date with today", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.fillStartDate("2026-10-15");
    await flightFinder.blurStartDate();

    await common.setSystemTime("2026-10-16T12:00:00");
    await common.reloadPage();

    await common.expectEnabled(flightFinder.searchButton);
    await common.expectValue(flightFinder.startDateInput, "2026-10-16");
    await flightFinder.expectStartDateMinimum("2026-10-16");
    await flightFinder.expectAirportSelected("AMS");
  });
});
