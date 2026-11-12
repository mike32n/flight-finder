import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AdminPage from "../pages/admin.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage, {
  type HeaderControlLayout,
} from "../pages/flight-finder.page";
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
        const user = await createVerifiedTestUser(
          "e2e-responsive-header-very-long-account-email",
        );

        await auth.login(user.email, user.password);
        await common.expectVisible(flightFinder.logoutButton);
      }

      await common.expectHidden(navigation.adminLink);

      for (const width of [
        320, 360, 390, 440, 768, 769, 800, 900, 1024, 1280,
      ]) {
        await flightFinder.expectHeaderLayoutAtWidth(width);
      }
    });
  }

  test("TC-NAV-02 | should navigate between in-page views while keeping the shared header", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    const searchAccess = await flightFinder.mockSearchAccessSequence(
      "registered",
      [{ maxDestinations: 3 }, { maxDestinations: 1 }],
    );
    await flightFinder.refreshSearchAccess();
    await searchAccess.expectRequestCount(1);
    await flightFinder.expectSearchAccessStatusHidden();

    for (const width of [320, 360, 390, 440, 768, 769, 800, 900, 1024, 1280]) {
      await flightFinder.expectHeaderLayoutAtWidth(width);
    }

    await common.expectLightThemeIsActive();
    await common.click(flightFinder.toggleThemeButton);
    await common.expectDarkThemeIsActive();
    await common.click(flightFinder.toggleThemeButton);
    await common.expectLightThemeIsActive();

    await navigation.openAdminView();
    await common.expectURL(/#admin$/);

    await navigation.returnToSearchView();
    await searchAccess.expectRequestCount(2);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (1 left)",
    );
    await common.expectVisible(flightFinder.heading);
    await common.expectVisible(navigation.adminLink);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-03 | should keep authentication and theme positions stable across auth states", async () => {
    const widths = [320, 360, 390, 440, 768, 769, 800, 900, 1024, 1280];
    const guestLayouts: HeaderControlLayout[] = [];

    for (const width of widths) {
      guestLayouts.push(await flightFinder.expectHeaderLayoutAtWidth(width));
    }

    const registeredUser = await createVerifiedTestUser(
      "e2e-responsive-header-layout",
    );
    await auth.login(registeredUser.email, registeredUser.password);

    for (let index = 0; index < widths.length; index++) {
      await flightFinder.expectHeaderLayoutAtWidth(widths[index]);
      await flightFinder.expectHeaderControlsMatch(guestLayouts[index]);
    }

    await common.click(flightFinder.logoutButton);
    const adminUser = await createVerifiedAdminTestUser();
    await auth.login(adminUser.email, adminUser.password);
    await common.expectVisible(navigation.adminLink);

    for (let index = 0; index < widths.length; index++) {
      await flightFinder.expectHeaderLayoutAtWidth(widths[index]);
      await flightFinder.expectHeaderControlsMatch(guestLayouts[index]);
    }
  });

  test("TC-NAV-04 | should support browser Back and Forward without duplicate policy loads", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    const searchAccess = await flightFinder.mockSearchAccessSequence(
      "registered",
      [{ maxDestinations: 3 }, { maxDestinations: 1 }],
    );
    await flightFinder.refreshSearchAccess();
    await searchAccess.expectRequestCount(1);
    await flightFinder.expectSearchAccessStatusHidden();

    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    await navigation.goBackToSearchView();
    await common.expectURL(Env.test);
    await searchAccess.expectRequestCount(2);
    await flightFinder.expectSearchAccessStatusHidden();
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code (1 left)",
    );

    await navigation.goForwardToAdminView();
    await common.expectURL(/#admin$/);
    await common.expectVisible(admin.content);
    await admin.expectRequestCount(1);
    await searchAccess.expectRequestCount(2);
  });

  test("TC-NAV-05 | should load and refresh a direct Administration URL", async () => {
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

  test("TC-NAV-06 | should reject direct Administration navigation for a non-admin", async () => {
    const user = await createVerifiedTestUser();

    await auth.login(user.email, user.password);
    await common.openPage(`${Env.test}#admin`);

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectVisible(flightFinder.logoutButton);
    await common.expectHidden(admin.content);
  });

  test("TC-NAV-07 | should reject direct Administration navigation after session expiration", async () => {
    await loginAsAdmin();
    await auth.mockCurrentUserFailure(401);

    await common.openPage(`${Env.test}#admin`);

    await navigation.expectSearchViewActive();
    await common.expectURL(/#search$/);
    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();
    await flightFinder.expectOnlySessionExpirationError();
  });

  test("TC-NAV-08 | should recheck admin authorization when history returns to Administration", async () => {
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

  test("TC-NAV-09 | should preserve unsaved Admin edits without reloading policies", async () => {
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

  test("TC-NAV-10 | should abort an active search and preserve its interrupted state", async () => {
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

  test("TC-NAV-11 | should hide admin navigation after logout and reject history restoration", async () => {
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

  test("TC-NAV-12 | should preserve newer navigation while a return refresh is pending", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    const held = await flightFinder.holdSearchAccess("registered", {
      maxDestinations: 2,
    });
    try {
      await navigation.beginReturnToSearchView();
      await held.waitUntilRequested();
      await held.expectRequestCount(1);

      await navigation.goBackWhileSearchRefreshPending();
      await common.expectVisible(admin.content);
      await held.expectRequestCount(1);
      await admin.expectRequestCount(1);
    } finally {
      held.release();
    }

    await navigation.expectAdminViewActive();
    await common.expectURL(/#admin$/);
    await admin.expectRequestCount(1);
    await held.expectRequestCount(1);

    await navigation.returnToSearchView();
    await held.expectRequestCount(2);
    await flightFinder.expectSearchAccessStatusHidden();
  });

  test("TC-NAV-13 | should keep Search active when history changes again during a refresh", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    const held = await flightFinder.holdSearchAccess("registered", {
      maxDestinations: 2,
    });
    try {
      await navigation.beginReturnToSearchView();
      await held.waitUntilRequested();
      await navigation.goBackWhileSearchRefreshPending();
      await navigation.goForwardWhileSearchRefreshPending();
      await held.expectRequestCount(2);
    } finally {
      held.release();
    }

    await flightFinder.expectSearchAccessStatusHidden();
    await navigation.expectSearchViewActive();
    await common.expectVisible(flightFinder.logoutButton);
    await held.expectRequestCount(2);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-14 | should leave Search unavailable when a return refresh fails", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    await navigation.openAdminView();
    await common.expectVisible(admin.content);
    await flightFinder.mockSearchAccessResponse(500, {});

    await navigation.returnToSearchView();
    await flightFinder.expectSearchAccessStatusMessage(
      "Search settings could not be loaded.",
    );
    await common.expectDisabled(flightFinder.searchButton);
    await flightFinder.expectDestinationPlaceholder(
      "Type city or IATA code...",
    );
    await common.expectVisible(flightFinder.logoutButton);
    await admin.expectRequestCount(1);
  });

  test("TC-NAV-15 | should resume Search when Admin revalidation is superseded", async () => {
    await loginAsAdmin();
    await mockAdminPolicies();
    await navigation.openAdminView();
    await common.expectVisible(admin.content);

    const access = await flightFinder.holdSearchAccess("registered", {
      maxDestinations: 2,
    });
    try {
      await navigation.beginReturnToSearchView();
      await access.waitUntilRequested();
      const revalidation = await navigation.holdNextAdminRevalidation();
      try {
        await navigation.beginBackToAdmin();
        await revalidation.waitUntilRequested();
        await navigation.goForwardWhileSearchRefreshPending();
        await access.expectRequestCount(2);
      } finally {
        revalidation.release();
      }
    } finally {
      access.release();
    }

    await flightFinder.expectSearchAccessStatusHidden();
    await navigation.expectSearchViewActive();
    await common.expectVisible(flightFinder.logoutButton);
    await access.expectRequestCount(2);
    await admin.expectRequestCount(1);
  });
});
