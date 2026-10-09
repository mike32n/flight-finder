import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";
import { createVerifiedTestUser } from "../helpers/user.helper";

const amsterdam = {
  city: "Amsterdam",
  code: "AMS",
  price: 30000,
};

const larnaca = {
  city: "Larnaca",
  code: "LCA",
  price: 25000,
};

const amsterdamText = "→ Amsterdam (AMS) 2026-10-09 → 2026-10-11 💶 HUF 30,000";

const larnacaText = "→ Larnaca (LCA) 2026-10-09 → 2026-10-11 💶 HUF 25,000";

test.describe("Search persistence", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("TC-PERSIST-01 | should restore previous results and current search setup after reload", async () => {
    const searchMock = await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectWeekdayOption("5");
    await flightFinder.fillNights("2");
    await flightFinder.clickSearchButton();

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await flightFinder.expectResultTexts([amsterdamText]);

    // Change the form without starting another search.
    await flightFinder.clickSelectedContainer("AMS");
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.selectWeekdayOption("2");
    await flightFinder.fillNights("3");

    await common.reloadPage();
    await flightFinder.expectRestoredSearchVisible();

    await flightFinder.expectAirportSelected("LCA");
    await flightFinder.expectAirportNotSelected("AMS");
    await flightFinder.expectWeekdayValue("2");
    await flightFinder.expectNightsValue("3");

    await flightFinder.expectResultTexts([amsterdamText]);
    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await flightFinder.expectSearchButtonEnabled();

    await searchMock.expectRequestCount(1);
  });

  test("TC-PERSIST-02 | should preserve guest results after login and clear them after logout", async () => {
    const user = await createVerifiedTestUser();

    const searchMock = await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.expectAuthControlsVisible();

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.clickSearchButton();

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await flightFinder.expectResultTexts([amsterdamText]);

    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();

    await auth.expectAuthModalHidden();
    await common.expectVisible(flightFinder.logoutButton);
    await flightFinder.expectResultTexts([amsterdamText]);

    await common.reloadPage();
    await flightFinder.expectRestoredSearchVisible();

    await common.expectVisible(flightFinder.logoutButton);
    await flightFinder.expectResultTexts([amsterdamText]);
    await searchMock.expectRequestCount(1);

    await flightFinder.clickLogoutButton();

    await flightFinder.expectAuthControlsVisible();
    await flightFinder.expectResultsEmpty();

    await common.reloadPage();

    // The restored airport confirms that setup restoration has run.
    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.expectAuthControlsVisible();
    await flightFinder.expectResultsEmpty();

    await searchMock.expectRequestCount(1);
  });

  test("TC-PERSIST-03 | should replace saved results when a new search completes", async () => {
    const searchMock = await flightFinder.mockSearchSequence([
      amsterdam,
      larnaca,
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.clickSearchButton();

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await flightFinder.expectResultTexts([amsterdamText]);

    await flightFinder.clickSelectedContainer("AMS");
    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.clickSearchButton();

    await flightFinder.expectResultTexts([larnacaText]);
    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await searchMock.expectRequestCount(2);

    await common.reloadPage();
    await flightFinder.expectRestoredSearchVisible();

    await flightFinder.expectAirportSelected("LCA");
    await flightFinder.expectResultTexts([larnacaText]);
    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");

    await searchMock.expectRequestCount(2);
  });
});
