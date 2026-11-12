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

  test("TC-RESULT-02 | should render full routes and keep results sorted by price", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Larnaca",
        originCity: "Budapest",
        code: "LCA",
        price: 40000,
        results: [
          {
            city: "Amsterdam",
            originCity: "Budapest",
            code: "AMS",
            price: 30000,
          },
        ],
      },
    ]);

    await flightFinder.selectAirportByEnter("lca");
    await flightFinder.selectAirportByEnter("ams");
    await common.click(flightFinder.searchButton);

    await common.expectText(flightFinder.resultCards, [
      "Budapest (BUD) → Amsterdam (AMS) 💶 HUF 30,000 2026-10-09 → 2026-10-11",
      "Budapest (BUD) → Larnaca (LCA) 💶 HUF 40,000 2026-10-09 → 2026-10-11",
    ]);
    await flightFinder.expectNoResultPriceInsight();
    await flightFinder.expectResultRoute(
      "Budapest (BUD) → Amsterdam (AMS)",
    );
    await flightFinder.expectResultCardLayoutAtWidth(1280);
  });

  test("TC-RESULT-03 | should fall back to destination-list city labels when result cities are missing", async () => {
    await flightFinder.mockSearchSequence([
      { code: "LCA", price: 25000 },
    ]);

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

    await flightFinder.expectResultRoute("Budapest (BUD) → Larnaca (LCA)");
    await flightFinder.expectNoResultPriceInsight();
  });

  test("TC-RESULT-04 | should stack long routes and prices without horizontal overflow", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Larnaca",
        originCity: "Budapest",
        code: "LCA",
        price: 123456789012,
      },
    ]);

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

    for (const width of [320, 360, 390, 768, 1280]) {
      await flightFinder.expectResultCardLayoutAtWidth(width);
    }

    await flightFinder.expectResultRoute(
      "Budapest (BUD) → Larnaca (LCA)",
    );
    await flightFinder.expectResultRouteLineCount(1);
  });

  test("TC-RESULT-05 | should keep the flexibility badge beside long routes on desktop and mobile", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Larnaca",
        originCity: "Budapest",
        code: "LCA",
        price: 20420,
        resultType: "flex",
        priceInsight: {
          percent: 72,
          basePrice: 72929,
        },
      },
    ]);

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

    for (const width of [320, 360, 390, 768, 1280]) {
      await flightFinder.expectResultCardLayoutAtWidth(width);
      await flightFinder.expectResultBadgeBesideRoute(
        "Flexible Dates",
        flightFinder.flexCard.first(),
      );
    }

    await common.expectContainsText(
      flightFinder.resultPriceInsight,
      "💡 72% cheaper than the original dates",
    );
  });

  test("TC-RESULT-06 | should keep both complete rows on desktop when both fit", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Palma de Mallorca",
        originCity: "Budapest",
        code: "PMI",
        price: 20420,
        resultType: "flex",
        priceInsight: { percent: 72, basePrice: 72929 },
      },
    ]);

    await flightFinder.selectAirportByEnter("pmi");
    await common.click(flightFinder.searchButton);

    const palmaCard = flightFinder.resultCardForDestination("Palma de Mallorca");

    await flightFinder.expectResultRoute(
      "Budapest (BUD) → Palma de Mallorca (PMI)",
      palmaCard,
    );
    await flightFinder.expectResultCardLayoutAtWidth(1280, palmaCard);
    await flightFinder.expectResultCardLayoutMode("desktop", palmaCard);
    await flightFinder.expectResultRowsFit(true, true, palmaCard);
    await flightFinder.expectResultBadgeBesideRoute(
      "Flexible Dates",
      palmaCard,
    );
    await flightFinder.expectRouteCityAndCodeTogether("PMI", palmaCard);
    await flightFinder.expectResultUnitScaling(
      { route: false, dates: false, price: false, insight: false },
      palmaCard,
    );
  });

  test("TC-RESULT-07 | should switch the entire card when the first row does not fit", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Palma de Mallorca",
        originCity: "Budapest",
        code: "PMI",
        price: 123456789012,
        resultType: "flex",
      },
    ]);

    await flightFinder.selectAirportByEnter("pmi");
    await common.click(flightFinder.searchButton);

    const card = flightFinder.resultCardForDestination("Palma de Mallorca");
    await flightFinder.setResultCardWidth(500, card);
    await flightFinder.expectResultRowsFit(false, true, card);
    await flightFinder.expectResultCardLayoutMode("mobile", card);
    await flightFinder.expectResultBadgeBesideRoute("Flexible Dates", card);
    await flightFinder.expectResultUnitScaling(
      { route: false, dates: false, price: false, insight: false },
      card,
    );
  });

  test("TC-RESULT-08 | should switch the entire card when the second row does not fit", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Larnaca",
        originCity: "Budapest",
        code: "LCA",
        price: 20420,
        resultType: "flex",
        priceInsight: {
          percent: 99,
          basePrice: 999999999999999,
        },
      },
    ]);

    await flightFinder.selectAirportByEnter("lca");
    await common.click(flightFinder.searchButton);

    const card = flightFinder.resultCardForDestination("Larnaca");
    await flightFinder.setResultCardWidth(540, card);
    await flightFinder.expectResultRowsFit(true, false, card);
    await flightFinder.expectResultCardLayoutMode("mobile", card);
    await flightFinder.expectResultUnitScaling(
      { route: false, dates: false, price: false, insight: false },
      card,
    );
  });

  test("TC-RESULT-09 | should keep desktop rows when both fit a narrower card", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Palma de Mallorca",
        originCity: "Budapest",
        code: "PMI",
        price: 20420,
        resultType: "flex",
        priceInsight: { percent: 72, basePrice: 72929 },
      },
    ]);

    await flightFinder.selectAirportByEnter("pmi");
    await common.click(flightFinder.searchButton);

    const card = flightFinder.resultCardForDestination("Palma de Mallorca");
    await flightFinder.setResultCardWidth(600, card);
    await flightFinder.expectResultRowsFit(true, true, card);
    await flightFinder.expectResultCardLayoutMode("desktop", card);
    await flightFinder.expectResultBadgeBesideRoute("Flexible Dates", card);
    await flightFinder.expectResultUnitScaling(
      { route: false, dates: false, price: false, insight: false },
      card,
    );
  });

  test("TC-RESULT-10 | should scale and wrap an overwide route to fit the mobile card", async () => {
    await flightFinder.mockSearchSequence([
      {
        city: "Palma de Mallorca",
        originCity: "Budapest",
        code: "PMI",
        price: 20420,
        resultType: "fallback-flex",
      },
    ]);

    await flightFinder.selectAirportByEnter("pmi");
    await common.click(flightFinder.searchButton);

    const card = flightFinder.resultCardForDestination("Palma de Mallorca");
    await flightFinder.setResultCardWidth(400, card);
    await flightFinder.expectResultCardLayoutMode("mobile", card);
    await flightFinder.expectResultRouteWrapped(card);
    await flightFinder.expectResultUnitScaling(
      { route: true, dates: false, price: false, insight: false },
      card,
    );
    await flightFinder.expectResultBadgeBesideRoute("Alternative Dates", card);
  });
});
