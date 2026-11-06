import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AdminPage from "../pages/admin.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage from "../pages/flight-finder.page";
import NavigationPage from "../pages/navigation.page";

import {
  createVerifiedTestUser,
  createVerifiedAdminTestUser,
} from "../helpers/user.helper";

const planDefaults = require("../../config/planDefaults");

test.describe("Admin navigation", () => {
  let common: CommonPage;
  let admin: AdminPage;
  let auth: AuthPage;
  let flightFinder: FlightFinderPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    admin = new AdminPage(page);
    auth = new AuthPage(page);
    flightFinder = new FlightFinderPage(page);
    navigation = new NavigationPage(page);

    await common.openPage(Env.test);
    await common.expectVisible(auth.loginButton);
  });

  async function loginAsAdmin(): Promise<void> {
    const user = await createVerifiedAdminTestUser();

    await auth.login(user.email, user.password);
    await common.expectVisible(navigation.adminLink);
  }

  async function mockAdminPolicies(): Promise<void> {
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });
  }

  for (const account of ["guest", "registered"] as const) {
    test(`TC-NAV-01-${account.toUpperCase()} | should hide admin navigation for a ${account} user`, async () => {
      if (account === "registered") {
        const user = await createVerifiedTestUser();

        await auth.login(user.email, user.password);
        await common.expectVisible(flightFinder.logoutButton);
      }

      await common.expectHidden(navigation.adminLink);
    });
  }

  test("TC-NAV-02 | should navigate between in-page views while keeping the shared header", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    for (const width of [320, 360, 390, 1280]) {
      await navigation.expectSharedCornerIconAtWidth(width);
    }
    await navigation.openAdminView();
    await common.expectURL(/#admin$/);

    await navigation.returnToSearchView();
    await common.expectVisible(flightFinder.heading);
    await common.expectVisible(navigation.adminLink);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-03 | should support browser Back and Forward without duplicate policy loads", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    await navigation.goBackToSearchView();
    await common.expectURL(Env.test);

    await navigation.goForwardToAdminView();
    await common.expectURL(/#admin$/);
    await common.expectVisible(admin.content);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-04 | should load and refresh a direct Administration URL", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    await common.openPage(`${Env.test}#admin`);
    await navigation.expectAdminViewActive();
    await common.expectVisible(admin.content);

    await common.reloadPage();
    await navigation.expectAdminViewActive();
    await common.expectVisible(admin.content);
    await admin.expectRequestCount(2);
  });

  test("TC-NAV-05 | should reject direct Administration navigation for a non-admin", async () => {
    const user = await createVerifiedTestUser();

    await auth.login(user.email, user.password);
    await common.openPage(`${Env.test}#admin`);

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectVisible(flightFinder.logoutButton);
    await common.expectHidden(admin.content);
  });

  test("TC-NAV-06 | should reject direct Administration navigation after session expiration", async () => {
    await loginAsAdmin();
    await auth.mockCurrentUserFailure(401);

    await common.openPage(`${Env.test}#admin`);

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();
    await flightFinder.expectOnlySessionExpirationError();
  });

  test("TC-NAV-07 | should recheck admin authorization when history returns to Administration", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    await navigation.openAdminView();
    await navigation.returnToSearchView();
    await navigation.mockAdminRevokedForCurrentUser();

    await common.goBack();

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectHidden(admin.content);
  });

  test("TC-NAV-08 | should preserve unsaved Admin edits without reloading policies", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    const maxDestinations = admin.getPolicyControl(
      "Maximum destinations",
      "anonymous",
    );
    const smartFlex = admin.getPolicyControl("Smart Flex", "anonymous");

    await common.fill(maxDestinations, "2");
    await common.setChecked(smartFlex, true);

    await navigation.returnToSearchView();
    await navigation.openAdminView();

    await common.expectValue(maxDestinations, "2");
    await common.expectChecked(smartFlex);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-09 | should abort an active search and preserve its interrupted state", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    const pendingSearch = await flightFinder.mockPendingSearch();
    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await pendingSearch.expectRequestCount(1);

    await navigation.openAdminView();
    await pendingSearch.expectAborted();
    await flightFinder.expectInterruptedSearchPersisted();

    await navigation.returnToSearchView();
    await flightFinder.expectAirportSelected("AMS");
    await common.reloadPage();
    await flightFinder.expectAirportSelected("AMS");
    await flightFinder.expectInterruptedSearchPersisted();
  });

  test("TC-NAV-10 | should hide admin navigation after logout and reject history restoration", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();

    await navigation.openAdminView();
    await navigation.returnToSearchView();
    await common.click(flightFinder.logoutButton);
    await common.expectVisible(auth.loginButton);
    await common.expectHidden(navigation.adminLink);
    await auth.expectAuthTokenRemoved();

    await common.goBack();

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectHidden(admin.content);

    await common.openPage(`${Env.test}admin.html`);
    await common.expectURL(Env.test);
    await common.expectVisible(auth.loginButton);
    await common.expectHidden(admin.content);
  });
});
