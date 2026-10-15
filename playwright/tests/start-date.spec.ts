import { test } from "@playwright/test";

import Env from "../utils/env";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Search start date", () => {
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    await page.clock.install({
      time: new Date("2026-10-15T12:00:00"),
    });

    flightFinder = new FlightFinderPage(page);

    await page.goto(Env.test);
    await flightFinder.expectSearchButtonEnabled();
  });

  test("should default to today and prevent earlier calendar dates", async () => {
    await flightFinder.expectStartDate("2026-10-15");
    await flightFinder.expectStartDateMinimum("2026-10-15");
  });

  test("should send the selected future start date", async () => {
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

  test("should preserve results when the start date is invalid", async () => {
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
    await flightFinder.clickSearchButton();

    await flightFinder.expectSearchValidationErrorText(
      "Start date cannot be in the past.",
    );
    await flightFinder.expectFirstResultVisible();

    await flightFinder.fillStartDate("");
    await flightFinder.clickSearchButton();

    await flightFinder.expectSearchValidationErrorText(
      "Please enter a valid start date.",
    );
    await flightFinder.expectFirstResultVisible();

    await searchMock.expectRequestCount(1);
  });
});
