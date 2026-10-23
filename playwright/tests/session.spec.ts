import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage from "../pages/flight-finder.page";
import { createVerifiedTestUser } from "../helpers/user.helper";

const amsterdam = {
  city: "Amsterdam",
  code: "AMS",
  price: 30000,
};

test.describe("Session lifecycle", () => {
  let common: CommonPage;
  let auth: AuthPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    auth = new AuthPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.openPage(Env.test);
    await common.expectVisible(auth.loginButton);
  });

  async function runPrivateSearch() {
    const user = await createVerifiedTestUser();

    await auth.login(user.email, user.password);
    await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    return user;
  }

  test("TC-SESSION-01 | should clear private results when session verification returns 401", async () => {
    const user = await createVerifiedTestUser();

    await auth.login(user.email, user.password);
    await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    await auth.mockCurrentUserFailure(401);
    await common.reloadPage();

    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();

    await common.expectText(
      flightFinder.sessionMessage,
      "Your session has expired. Please sign in again.",
    );

    await common.expectEnabled(flightFinder.searchButton);
    await flightFinder.expectResultsEmpty();
  });

  test("TC-SESSION-02 | should preserve guest results when an invalid token is rejected", async () => {
    await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    await auth.setInvalidAuthToken();
    await common.reloadPage();

    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();

    await flightFinder.expectRestoredSearchVisible();
    await common.expectVisible(flightFinder.firstResult);
    await common.expectEnabled(flightFinder.searchButton);
  });

  for (const failure of [500, "network"] as const) {
    test(`TC-SESSION-03-${String(failure).toUpperCase()} | should retain the session and recover saved results after a temporary failure`, async () => {
      const user = await createVerifiedTestUser();

      await auth.login(user.email, user.password);
      await flightFinder.mockSearchSequence([amsterdam]);

      await flightFinder.selectAirportByEnter("ams");
      await common.click(flightFinder.searchButton);
      await flightFinder.expectResultsFooterText("Finished");

      await auth.mockCurrentUserFailure(failure);
      await common.reloadPage();

      await common.expectContainsText(
        flightFinder.searchAccessStatus,
        "Your session could not be verified.",
      );

      await auth.expectAuthTokenPresent();
      await common.expectDisabled(flightFinder.searchButton);
      await flightFinder.expectResultsEmpty();

      await auth.clearCurrentUserMock();
      await common.reloadPage();

      await common.expectVisible(flightFinder.logoutButton);
      await flightFinder.expectRestoredSearchVisible();
      await common.expectVisible(flightFinder.firstResult);
      await common.expectEnabled(flightFinder.searchButton);
    });
  }

  test("TC-SESSION-04 | should discard results belonging to a different user", async () => {
    const firstUser = await createVerifiedTestUser();
    const secondUser = await createVerifiedTestUser();

    await auth.login(firstUser.email, firstUser.password);
    await flightFinder.mockSearchSequence([amsterdam]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    await auth.loginViaApi(secondUser.email, secondUser.password);
    await common.reloadPage();

    await common.expectContainsText(
      flightFinder.authContainer,
      secondUser.email,
    );

    await common.expectEnabled(flightFinder.searchButton);
    await auth.expectAuthTokenPresent();
    await flightFinder.expectResultsEmpty();
  });

  test("TC-SESSION-05 | should restore private results after cached-page session verification", async () => {
    const user = await runPrivateSearch();

    await common.simulateCachedPageRestore();

    await common.expectContainsText(flightFinder.authContainer, user.email);
    await common.expectEnabled(flightFinder.searchButton);
    await common.expectVisible(flightFinder.firstResult);
    await auth.expectAuthTokenPresent();
  });

  test("TC-SESSION-06 | should clear private results when a cached page restores an expired session", async () => {
    await runPrivateSearch();

    await auth.mockCurrentUserFailure(401);
    await common.simulateCachedPageRestore();

    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();

    await common.expectText(
      flightFinder.sessionMessage,
      "Your session has expired. Please sign in again.",
    );

    await common.expectEnabled(flightFinder.searchButton);
    await flightFinder.expectResultsEmpty();
  });

  test("TC-SESSION-07 | should hide private results during a verification failure and restore them after recovery", async () => {
    const user = await runPrivateSearch();

    await auth.mockCurrentUserFailure(500);
    await common.simulateCachedPageRestore();

    await common.expectContainsText(
      flightFinder.searchAccessStatus,
      "Your session could not be verified.",
    );

    await auth.expectAuthTokenPresent();
    await common.expectDisabled(flightFinder.searchButton);
    await common.expectHidden(flightFinder.results);
    await common.expectHidden(flightFinder.authContainer);

    await auth.clearCurrentUserMock();
    await common.simulateCachedPageRestore();

    await common.expectContainsText(flightFinder.authContainer, user.email);
    await common.expectEnabled(flightFinder.searchButton);
    await common.expectVisible(flightFinder.firstResult);
  });

  test("TC-SESSION-08 | should clear private results when another tab removes the token", async () => {
    await runPrivateSearch();

    await auth.setAuthTokenFromAnotherTab(null);

    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();
    await common.expectEnabled(flightFinder.searchButton);
    await flightFinder.expectResultsEmpty();
  });
});
