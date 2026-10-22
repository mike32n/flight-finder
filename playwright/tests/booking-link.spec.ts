import { test } from "../fixtures/search-ui.fixture";

import Env from "../utils/env";
import FlightFinderPage from "../pages/flight-finder.page";
import CommonPage from "../pages/common.page";

test.describe("Booking links", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.openPage(Env.test);
  });

  test("TC-BOOKING-01 | should open booking page in new tab", async () => {
    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.expectAirportSelected("AMS");

    await flightFinder.selectWeekdayOption("5");
    await common.click(flightFinder.incrementButton, 2);

    await common.click(flightFinder.searchButton);

    await common.expectVisible(flightFinder.firstResult);

    const bookingPage = await flightFinder.clickFirstResultAndGetBookingPage();

    await flightFinder.expectBookingPageOpened(bookingPage);
  });
});
