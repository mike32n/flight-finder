import { test } from "@playwright/test";

import Env from "../utils/env";
import MainPage from "../pages/main.page";

test.describe("Booking links", () => {
  let main: MainPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);

    await page.goto(Env.test);
  });

  test("opens booking page in new tab", async () => {
    await main.selectAirportByEnter("ams");
    await main.expectAirportSelected("AMS");

    await main.selectWeekdayOption("5");
    await main.clickIncrementButton(2);

    await main.clickSearchButton();

    await main.expectFirstResultVisible();

    await main.expectBookingPageOpened();
  });
});
