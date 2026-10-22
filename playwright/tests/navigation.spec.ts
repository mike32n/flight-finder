import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage from "../pages/flight-finder.page";
import NavigationPage from "../pages/navigation.page";

import {
  createVerifiedTestUser,
  createVerifiedAdminTestUser,
} from "../helpers/user.helper";

test.describe("Admin navigation", () => {
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

    // Wait until the initial authentication state has been rendered.
    await common.expectVisible(auth.loginButton);
  });

  for (const account of ["guest", "registered"] as const) {
    test(`TC-NAV-01-${account.toUpperCase()} | should hide admin navigation for a ${account} user`, async () => {
      if (account === "registered") {
        const user = await createVerifiedTestUser();

        await common.click(auth.loginButton);
        await auth.fillLoginForm(user.email, user.password);
        await common.click(auth.loginSubmitButton);

        await common.expectHidden(auth.authModal);
        await common.expectVisible(flightFinder.logoutButton);
      }

      await common.expectHidden(navigation.adminLink);
    });
  }

  test("TC-NAV-02 | should navigate to administration and back as an admin", async () => {
    const user = await createVerifiedAdminTestUser();

    await common.click(auth.loginButton);
    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);

    await common.expectHidden(auth.authModal);
    await common.expectVisible(navigation.adminLink);

    await common.click(navigation.adminLink);

    await common.expectURL(new URL("/admin.html", Env.test).href);
    await common.expectVisible(navigation.backToFlightFinderLink);

    await common.click(navigation.backToFlightFinderLink);

    await common.expectURL(Env.test);
    await common.expectVisible(flightFinder.heading);
    await common.expectVisible(navigation.adminLink);
  });

  test("TC-NAV-03 | should hide admin navigation after logout and keep it hidden after reload", async () => {
    const user = await createVerifiedAdminTestUser();

    await common.click(auth.loginButton);
    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);

    await common.expectHidden(auth.authModal);
    await common.expectVisible(navigation.adminLink);

    await common.click(flightFinder.logoutButton);

    await common.expectVisible(auth.loginButton);
    await common.expectHidden(navigation.adminLink);
    await auth.expectAuthTokenRemoved();

    await common.reloadPage();

    await common.expectVisible(auth.loginButton);
    await common.expectHidden(navigation.adminLink);
  });
});
