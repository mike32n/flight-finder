import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import FlightFinderPage from "../pages/flight-finder.page";
import { createVerifiedTestUser } from "../helpers/user.helper";

test("TC-BFCACHE-01 | should restore a private search through genuine browser BFCache navigation", async ({
  page,
}) => {
  const common = new CommonPage(page);
  const auth = new AuthPage(page);
  const flightFinder = new FlightFinderPage(page);
  const user = await createVerifiedTestUser();

  await common.openPage(Env.test);
  await common.expectVisible(auth.loginButton);
  await auth.login(user.email, user.password);
  await flightFinder.expectSearchAccessReady();

  await flightFinder.selectAirportByEnter("ams");
  await common.click(flightFinder.searchButton);
  await flightFinder.expectResultsFooterText("Finished");
  await common.expectVisible(flightFinder.firstResult);
  await flightFinder.expectSearchAccessReady();
  await flightFinder.expectSmartFlexPreference(true, true);

  await common.observeBFCacheLifecycle();
  await common.openLocalDocument(
    "/reset-password.html",
    "/api/auth/reset-password/reset-password.html",
  );
  await common.goBackAndExpectBFCacheRestore();

  await auth.expectAuthenticatedUser(user.email);
  await common.expectVisible(flightFinder.authContainer);
  await common.expectVisible(flightFinder.logoutButton);
  await common.expectHidden(auth.loginButton);
  await flightFinder.expectRestoredSearchVisible();
  await common.expectVisible(flightFinder.firstResult);
  await flightFinder.expectSearchAccessReady();
  await flightFinder.expectSmartFlexPreference(true, true);
});
