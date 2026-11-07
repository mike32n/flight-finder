import { test } from "../fixtures/search-ui.fixture";

import Env from "../utils/env";
import AdminPage from "../pages/admin.page";
import AuthPage from "../pages/auth.page";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import NavigationPage from "../pages/navigation.page";

import { createVerifiedAdminTestUser } from "../helpers/user.helper";

const planDefaults = require("../../config/planDefaults");

test.describe("Responsive scrolling", () => {
  test("TC-SCROLL-01 | should scroll Search and Administration in the appropriate container", async ({
    page,
  }) => {
    const common = new CommonPage(page);
    const auth = new AuthPage(page);
    const admin = new AdminPage(page);
    const flightFinder = new FlightFinderPage(page);
    const navigation = new NavigationPage(page);

    await common.openPage(Env.test);
    await common.expectVisible(auth.loginButton);

    const user = await createVerifiedAdminTestUser();
    await auth.login(user.email, user.password);
    await common.expectVisible(navigation.adminLink);

    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });

    await flightFinder.mockSearchSequence([
      {
        city: "Amsterdam",
        code: "AMS",
        price: 20000,
        results: [
          { city: "Larnaca", code: "LCA", price: 21000 },
          { city: "Palma de Mallorca", code: "PMI", price: 22000 },
          { city: "Paris", code: "CDG", price: 23000 },
          { city: "Athens", code: "ATH", price: 24000 },
        ],
      },
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    await navigation.expectResultsScrollbarStableAtWidth(1280);
    await navigation.expectResultsScrollbarStableAtWidth(1024);
    await navigation.expectResultsFooterFixedAndDynamic();

    for (const width of [1280, 1024, 768, 390, 360, 320]) {
      await navigation.expectResponsiveScrollingAtWidth(width, admin.content);
    }

    await navigation.expectResponsiveScrollingAtHeight(
      900,
      admin.content,
      false,
      false,
    );
    await navigation.expectResponsiveScrollingAtHeight(
      780,
      admin.content,
      false,
      true,
    );
    await navigation.expectResponsiveScrollingAtHeight(
      500,
      admin.content,
      true,
      false,
    );
  });

  test("TC-SCROLL-02 | should not grow the empty Search shell with viewport height", async ({
    page,
  }) => {
    const common = new CommonPage(page);
    const auth = new AuthPage(page);
    const navigation = new NavigationPage(page);

    await common.openPage(Env.test);
    await common.expectVisible(auth.loginButton);
    await navigation.expectEmptyResultsShellDoesNotGrowWithViewport();
  });
});
