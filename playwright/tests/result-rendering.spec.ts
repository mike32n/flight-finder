import { test } from "../fixtures/search-ui.fixture";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Result rendering", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);

    await common.openPage(Env.test);
  });

  test("TC-RESULT-SECURITY-01 | should render city markup as text before and after reload", async () => {
    const city = '<img src=x onerror="document.body.dataset.injected=1">';

    await flightFinder.mockSearchSequence([
      { city, code: "AMS", price: 30000 },
    ]);

    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);
    await flightFinder.expectResultsFooterText("Finished");

    await common.expectContainsText(flightFinder.firstResult, city);
    await common.expectNotPresent(flightFinder.resultImages);

    await common.reloadPage();

    await common.expectVisible(flightFinder.firstResult);
    await common.expectContainsText(flightFinder.firstResult, city);
    await common.expectNotPresent(flightFinder.resultImages);
  });
});
