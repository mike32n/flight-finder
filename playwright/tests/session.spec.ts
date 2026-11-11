import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage from "../pages/flight-finder.page";
import NavigationPage from "../pages/navigation.page";
import {
  createVerifiedAdminTestUser,
  createVerifiedTestUser,
} from "../helpers/user.helper";

const { updateSmartFlexPreference } = require("../../models/userModel");

const amsterdam = {
  city: "Amsterdam",
  code: "AMS",
  price: 30000,
};

test.describe("Session lifecycle", () => {
  let common: CommonPage;
  let auth: AuthPage;
  let flightFinder: FlightFinderPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    auth = new AuthPage(page);
    flightFinder = new FlightFinderPage(page);
    navigation = new NavigationPage(page);

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
      "⚠️ Your session has expired. Please sign in again.",
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
      "⚠️ Your session has expired. Please sign in again.",
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

  test("TC-SESSION-09 | should replace a search error with a dismissible expiration message and clear authenticated UI", async () => {
    await flightFinder.mockSearchSession("premium", true);
    await auth.login("search@example.com", "password");
    await common.expectVisible(flightFinder.logoutButton);
    await common.expectVisible(navigation.adminLink);
    await common.expectContainsText(
      flightFinder.searchAccessStatus,
      "Premium",
    );

    await flightFinder.selectAirportByEnter("ams");
    await flightFinder.selectAirportByEnter("bcn");
    await flightFinder.mockAnonymousSearchAccess();
    await flightFinder.refreshSearchAccess();
    await flightFinder.expectClearedDestinationWarning();
    await flightFinder.rememberSharedErrorElement();

    await auth.mockCurrentUserFailure(401);
    await common.simulateCachedPageRestore();

    await common.expectVisible(auth.loginButton);
    await common.expectHidden(flightFinder.logoutButton);
    await auth.expectAuthTokenRemoved();
    await flightFinder.expectPrivateSearchDataRemoved();
    await common.expectHidden(navigation.adminLink);
    await common.expectContainsText(flightFinder.searchAccessStatus, "Guest");
    await flightFinder.expectOnlySessionExpirationError();
    await flightFinder.expectSharedErrorElementReused();
    await flightFinder.expectErrorCardLayoutAtWidth(320);
    await common.expectEnabled(flightFinder.searchButton);
    await flightFinder.expectResultsEmpty();

    await flightFinder.dismissSessionMessage();
    await common.simulateCachedPageRestore();
    await common.expectHidden(flightFinder.sessionMessage);
  });

  test("TC-SESSION-10 | should display only the current user's saved Smart Flex preference", async () => {
    const firstUser = await createVerifiedTestUser();
    const secondUser = await createVerifiedTestUser();
    await updateSmartFlexPreference(secondUser.userId, false, 0);

    await flightFinder.expectSmartFlexPreference(false);
    await auth.login(firstUser.email, firstUser.password);
    await flightFinder.expectSmartFlexPreference(true, true);
    await flightFinder.toggleSmartFlexPreference();
    await flightFinder.expectSmartFlexPreference(false, true);
    await common.reloadPage();
    await flightFinder.expectSmartFlexPreference(false, true);

    await common.click(flightFinder.logoutButton);
    await flightFinder.expectSmartFlexPreference(false);
    await auth.login(secondUser.email, secondUser.password);
    await flightFinder.expectSmartFlexPreference(false, true);
    await flightFinder.toggleSmartFlexPreference();
    await flightFinder.expectSmartFlexPreference(true, true);
    await common.reloadPage();
    await flightFinder.expectSmartFlexPreference(true, true);

    await common.click(flightFinder.logoutButton);
    await auth.login(firstUser.email, firstUser.password);
    await flightFinder.expectSmartFlexPreference(false, true);
    await updateSmartFlexPreference(firstUser.userId, true, 1);
    await common.simulateCachedPageRestore();
    await flightFinder.expectSmartFlexPreference(true, true);

    await auth.mockCurrentUserFailure(401);
    await common.simulateCachedPageRestore();
    await flightFinder.expectSmartFlexPreference(false);
    await auth.expectAuthTokenRemoved();
  });

  test("TC-SESSION-11 | should restore the saved preference when a change is rejected", async () => {
    const user = await createVerifiedTestUser();
    await auth.login(user.email, user.password);
    await flightFinder.expectSmartFlexPreference(true, true);
    await flightFinder.mockSmartFlexSaveFailure(400);

    await flightFinder.toggleSmartFlexPreference();

    await flightFinder.expectSmartFlexSaveError("saved");
    await flightFinder.expectSmartFlexPreference(true, true);
    await flightFinder.clearSmartFlexSaveFailure();
    await flightFinder.toggleSmartFlexPreference();
    await flightFinder.expectSmartFlexPreference(false, true);
    await flightFinder.expectSmartFlexSaveErrorHidden();
    await common.reloadPage();
    await flightFinder.expectSmartFlexPreference(false, true);
  });

  test("TC-SESSION-12 | should reconcile the preference after an uncertain save", async () => {
    const user = await createVerifiedTestUser();
    await auth.login(user.email, user.password);
    await flightFinder.expectSmartFlexPreference(true, true);
    await flightFinder.mockSmartFlexSaveFailure(500);

    await flightFinder.toggleSmartFlexPreference();

    await flightFinder.expectSmartFlexSaveError("confirmed");
    await flightFinder.expectSmartFlexPreference(true, true);
    await common.expectEnabled(flightFinder.searchButton);
  });

  test("TC-SESSION-13 | should show Smart Flex save errors in both Admin and Search", async () => {
    const user = await createVerifiedAdminTestUser();
    await auth.login(user.email, user.password);
    await navigation.openAdminView();
    await flightFinder.expectSmartFlexPreference(true, true);
    await flightFinder.mockSmartFlexSaveFailure(400);

    await flightFinder.toggleSmartFlexPreference();
    await flightFinder.expectSmartFlexSaveError("saved");
    for (const width of [320, 360, 390, 768, 1280]) {
      await flightFinder.expectSmartFlexErrorLayoutAtWidth(width);
    }

    await navigation.returnToSearchView();
    await flightFinder.expectSmartFlexSaveError("saved");
    await flightFinder.clearSmartFlexSaveFailure();
    await flightFinder.toggleSmartFlexPreference();
    await flightFinder.expectSmartFlexPreference(false, true);
    await flightFinder.expectSmartFlexSaveErrorHidden();
  });

  test("TC-SESSION-14 | should retain a newer cross-tab session after a delayed login resolves", async () => {
    const firstUser = await createVerifiedTestUser();
    const secondUser = await createVerifiedTestUser();
    await updateSmartFlexPreference(secondUser.userId, false, 0);
    const heldLogin = await auth.holdNextLoginResponse();

    let secondAuth: AuthPage | undefined;

    try {
      await auth.beginLogin(firstUser.email, firstUser.password);
      await heldLogin.waitUntilRequested();

      secondAuth = await auth.openSharedSessionPage(Env.test);
      const secondFlightFinder = new FlightFinderPage(secondAuth.page);

      await secondAuth.login(secondUser.email, secondUser.password);
      await secondAuth.expectAuthenticatedUser(secondUser.email);
      await secondFlightFinder.expectSmartFlexPreference(false, true);
      await secondFlightFinder.expectRegisteredSearchAccessReady();

      await auth.expectAuthenticatedUser(secondUser.email);
      await auth.expectSameAuthToken(secondAuth);
      await flightFinder.expectSmartFlexPreference(false, true);
      await flightFinder.expectRegisteredSearchAccessReady();

      heldLogin.release();
      await heldLogin.waitUntilProcessed();

      await auth.expectAuthenticatedUser(secondUser.email);
      await auth.expectSameAuthToken(secondAuth);
      await auth.expectLoginFormOpen();
      await auth.expectLoginSubmitEnabled();
      await flightFinder.expectSmartFlexPreference(false, true);
      await flightFinder.expectRegisteredSearchAccessReady();
    } finally {
      heldLogin.release();
      if (secondAuth) await secondAuth.closePage();
    }
  });
});
