import { test } from "../fixtures/search-ui.fixture";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";

test.describe("Search stream parsing", () => {
  test("TC-STREAM-01 | should preserve event-like text in results and after reload", async ({
    page,
  }) => {
    const common = new CommonPage(page);
    const flightFinder = new FlightFinderPage(page);

    const city = "Amsterdam event: end event: error event: fail data: extra";

    const resultText = `BUD → ${city} (AMS) 2026-10-09 → 2026-10-11 💶 HUF 30,000`;

    await flightFinder.mockSearchSequence([
      { city, code: "AMS", price: 30000 },
    ]);

    await common.openPage(Env.test);
    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);

    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
    await common.expectText(flightFinder.resultCards, [resultText]);

    await common.reloadPage();
    await flightFinder.expectRestoredSearchVisible();

    await common.expectText(flightFinder.resultCards, [resultText]);
    await flightFinder.expectResultsFooterText("Finished...(failed: 0)");
  });
});
