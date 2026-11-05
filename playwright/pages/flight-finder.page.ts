import { Locator, Page, expect } from "@playwright/test";
import {
  getSearchAccess,
  SearchPlan,
  SearchPolicy,
} from "../data/search-access";

type MockSearchResult = {
  city?: string;
  originCity?: string;
  code: string;
  price: number;
  resultType?: "base" | "flex" | "fallback-flex";
  priceInsight?: {
    percent: number;
    basePrice: number;
  };
};

type MockSearchResponse = MockSearchResult & {
  completed?: boolean;
  results?: MockSearchResult[];
};

export default class MainPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly mainPageHeader: Locator;
  readonly searchAccessStatus: Locator;
  readonly sessionMessage: Locator;
  readonly errorCards: Locator;

  readonly authContainer: Locator;
  readonly logoutButton: Locator;

  readonly toggleThemeButton: Locator;
  readonly searchButton: Locator;
  readonly incrementButton: Locator;
  readonly decrementButton: Locator;

  readonly originInput: Locator;
  readonly originValue: Locator;
  readonly originAutocompleteList: Locator;
  readonly originAutocompleteItems: Locator;
  readonly airportInput: Locator;
  readonly weekdaySelect: Locator;
  readonly selectedWeekdayOption: Locator;
  readonly nightsInput: Locator;
  readonly startDateInput: Locator;
  readonly autocompleteList: Locator;
  readonly selectedContainer: Locator;
  readonly selectedDestinationBadges: Locator;
  readonly noAirportsSelectedWarning: Locator;
  readonly searchValidationError: Locator;
  readonly oldDestinationLimitWarning: Locator;
  readonly autocompleteItem: Locator;
  readonly activeAutocompleteItem: Locator;
  readonly firstResult: Locator;
  readonly results: Locator;
  readonly resultCards: Locator;
  readonly resultImages: Locator;
  readonly resultsFooter: Locator;

  readonly flexCard: Locator;
  readonly fallbackFlexCard: Locator;
  readonly resultRoute: Locator;
  readonly resultRouteLabel: Locator;
  readonly resultDates: Locator;
  readonly resultPrice: Locator;
  readonly resultPriceInsight: Locator;

  readonly noResultsCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.mainPageHeader = page.locator(".main-page-header");
    this.searchAccessStatus = page.locator("#search-access-status");
    this.sessionMessage = page.locator("#search-validation-error");
    this.errorCards = page.locator(".error-card");

    this.authContainer = page.locator("#auth-container");
    this.logoutButton = page.getByRole("button", {
      name: "Logout",
      exact: true,
    });

    this.toggleThemeButton = page.getByRole("button", {
      name: /theme/i,
    });

    this.searchButton = page.getByRole("button", {
      name: /search/i,
    });

    this.incrementButton = page.getByRole("button", {
      name: "+",
    });

    this.decrementButton = page.getByRole("button", {
      name: /^[−-]$/,
    });

    this.airportInput = page.getByRole("textbox", {
      name: "Destination",
      exact: true,
    });

    this.originInput = page.getByRole("textbox", {
      name: "Departure airport",
      exact: true,
    });
    this.originValue = page.locator("#origin");
    this.originAutocompleteList = page.locator("#origin-autocomplete-list");
    this.originAutocompleteItems =
      this.originAutocompleteList.locator(".autocomplete-item");

    this.weekdaySelect = page.locator("#weekday");

    this.selectedWeekdayOption = this.weekdaySelect.locator("option:checked");

    this.nightsInput = page.locator("#nights");

    this.startDateInput = page.locator("#start-date");

    this.autocompleteList = page.locator("#autocomplete-list");

    this.selectedContainer = page.locator("#selected-container");

    this.selectedDestinationBadges =
      this.selectedContainer.locator(".iata-badge");

    this.noAirportsSelectedWarning =
      this.selectedContainer.locator(".error-card");

    this.searchValidationError = page.locator("#search-validation-error");
    this.oldDestinationLimitWarning = page.getByText(
      "Some destinations were removed to match your current search settings.",
      { exact: true },
    );

    this.autocompleteItem = this.autocompleteList.locator(".autocomplete-item");

    this.activeAutocompleteItem = this.autocompleteList.locator(
      ".autocomplete-item.active",
    );

    this.results = page.locator("#results");
    this.resultImages = this.results.locator("img");
    this.resultCards = this.results.locator(".card");
    this.firstResult = this.resultCards.first();

    this.resultsFooter = page.locator("#results-footer");

    this.flexCard = page.locator(".flex-card").filter({
      has: page.getByText("Flexible Dates", { exact: true }),
    });

    this.fallbackFlexCard = page.locator(".flex-card").filter({
      has: page.getByText("Alternative Dates", { exact: true }),
    });
    this.resultRoute = this.firstResult.locator(".result-route");
    this.resultRouteLabel = this.resultRoute.locator("strong");
    this.resultDates = this.firstResult.locator(".result-dates");
    this.resultPrice = this.firstResult.locator(".result-price");
    this.resultPriceInsight = this.firstResult.locator(".price-insight");

    this.noResultsCard = page.locator(".no-results-card");
  }

  async setStoredDarkTheme(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
  }

  async expectMainPageElementsVisible(): Promise<void> {
    for (const element of [
      this.heading,
      this.originInput,
      this.airportInput,
      this.weekdaySelect,
      this.decrementButton,
      this.incrementButton,
      this.nightsInput,
      this.searchButton,
      this.toggleThemeButton,
    ]) {
      await expect(element).toBeVisible();
    }
  }

  async expectHeaderLayoutAtWidth(
    width: number,
    statusText?: string,
  ): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });

    if (statusText !== undefined) {
      await this.searchAccessStatus.evaluate((element, text) => {
        element.textContent = text;
      }, statusText);
    }

    const layout = await this.mainPageHeader.evaluate((header) => {
      const admin = header.querySelector("#admin-link");
      const status = header.querySelector("#search-access-status");
      const theme = header.querySelector("#theme-button");

      if (!admin || !status || !theme) {
        throw new Error("Main page header elements are missing");
      }

      const headerBox = header.getBoundingClientRect();
      const adminBox = admin.getBoundingClientRect();
      const statusBox = status.getBoundingClientRect();
      const themeBox = theme.getBoundingClientRect();

      return {
        headerCenter: headerBox.left + headerBox.width / 2,
        statusCenter: statusBox.left + statusBox.width / 2,
        adminRight: adminBox.right,
        statusLeft: statusBox.left,
        statusRight: statusBox.right,
        themeLeft: themeBox.left,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    expect(
      Math.abs(layout.statusCenter - layout.headerCenter),
    ).toBeLessThanOrEqual(1);
    expect(layout.statusLeft).toBeGreaterThanOrEqual(layout.adminRight);
    expect(layout.statusRight).toBeLessThanOrEqual(layout.themeLeft);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    await expect(this.searchAccessStatus).toBeVisible();
  }

  async clickSelectedContainer(code: string): Promise<void> {
    await this.selectedContainer.getByText(code).click();
  }

  resultCardForDestination(city: string): Locator {
    return this.resultCards.filter({ hasText: city });
  }

  async expectResultCardLayoutAtWidth(
    width: number,
    card: Locator = this.firstResult,
  ): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        card.evaluate((element) => {
          const style = getComputedStyle(element);
          const contentWidth =
            element.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight);

          return (
            Math.abs(Number(element.dataset.layoutWidth) - contentWidth) < 0.5
          );
        }),
      )
      .toBe(true);

    await this.expectResultCardGeometry(card);
  }

  async setResultCardWidth(
    width: number,
    card: Locator = this.firstResult,
  ): Promise<void> {
    await card.evaluate((element, requestedWidth) => {
      element.style.boxSizing = "border-box";
      element.style.width = `${requestedWidth}px`;
    }, width);
  }

  async expectResultCardLayoutMode(
    mode: "desktop" | "mobile",
    card: Locator = this.firstResult,
  ): Promise<void> {
    await expect(card).toHaveAttribute("data-layout", mode);
    await this.expectResultCardGeometry(card);
  }

  async expectResultRowsFit(
    primaryFits: boolean,
    secondaryFits: boolean,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const rowFits = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      const availableWidth =
        element.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const measureRow = (selector: string) => {
        const row = element.querySelector(selector);
        if (!row) throw new Error(`Missing result row: ${selector}`);
        const units = [...row.querySelectorAll(":scope > .result-unit")];
        const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
        const requiredWidth =
          units.reduce(
            (total, unit) => total + unit.getBoundingClientRect().width,
            0,
          ) +
          Math.max(0, units.length - 1) * gap;

        return requiredWidth <= availableWidth;
      };

      return {
        primary: measureRow(".result-row-primary"),
        secondary: measureRow(".result-row-secondary"),
      };
    });

    expect(rowFits.primary).toBe(primaryFits);
    expect(rowFits.secondary).toBe(secondaryFits);
  }

  private async expectResultCardGeometry(card: Locator): Promise<void> {
    const layout = await card.evaluate((element) => {
      const cardRect = element.getBoundingClientRect();
      const cardStyle = getComputedStyle(element);
      const innerLeft =
        cardRect.left +
        parseFloat(cardStyle.borderLeftWidth) +
        parseFloat(cardStyle.paddingLeft);
      const innerRight =
        cardRect.right -
        parseFloat(cardStyle.borderRightWidth) -
        parseFloat(cardStyle.paddingRight);
      const unit = (selector: string) => {
        const node = element.querySelector(selector);
        if (!(node instanceof HTMLElement)) {
          throw new Error(`Missing result unit: ${selector}`);
        }
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(getComputedStyle(node).fontSize),
          whiteSpace: getComputedStyle(node).whiteSpace,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          textAlign: getComputedStyle(node).textAlign,
          baseFontSize: Number(node.dataset.baseFontSize),
          scaled: node.dataset.scaled === "true",
        };
      };
      const row = (selector: string) => {
        const node = element.querySelector(selector);
        if (!(node instanceof HTMLElement)) {
          throw new Error(`Missing result row: ${selector}`);
        }
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      };

      return {
        mode: element.dataset.layout,
        innerLeft,
        innerRight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        primaryRow: row(".result-row-primary"),
        secondaryRow: row(".result-row-secondary"),
        route: unit(".result-route"),
        dates: unit(".result-dates"),
        price: unit(".result-price"),
        insight: element.querySelector(".price-insight")
          ? unit(".price-insight")
          : null,
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);

    const units = [
      layout.route,
      layout.dates,
      layout.price,
      layout.insight,
    ].filter((entry) => entry !== null);
    units.forEach((entry) => {
      expect(entry.whiteSpace).toBe("nowrap");
      expect(entry.scrollWidth).toBeLessThanOrEqual(entry.clientWidth + 1);
      expect(entry.height).toBeLessThanOrEqual(entry.fontSize * 1.8);
      expect(entry.left).toBeGreaterThanOrEqual(layout.innerLeft - 1);
      expect(entry.right).toBeLessThanOrEqual(layout.innerRight + 1);
    });

    if (layout.mode === "desktop") {
      expect(layout.primaryRow).not.toBeNull();
      expect(layout.secondaryRow).not.toBeNull();
      expect(
        Math.abs(
          layout.route.top +
            layout.route.height / 2 -
            (layout.price.top + layout.price.height / 2),
        ),
      ).toBeLessThanOrEqual(2);
      expect(layout.route.right).toBeLessThanOrEqual(layout.price.left);
      expect(layout.price.textAlign).toBe("right");
      expect(layout.price.right).toBeCloseTo(layout.primaryRow.right, 0);
      if (layout.insight) {
        expect(
          Math.abs(
            layout.dates.top +
              layout.dates.height / 2 -
              (layout.insight.top + layout.insight.height / 2),
          ),
        ).toBeLessThanOrEqual(2);
        expect(layout.dates.right).toBeLessThanOrEqual(layout.insight.left);
        expect(layout.insight.textAlign).toBe("right");
        expect(layout.insight.right).toBeCloseTo(layout.secondaryRow.right, 0);
      }
    } else {
      expect(layout.route.top).toBeLessThan(layout.dates.top);
      expect(layout.dates.top).toBeLessThan(layout.price.top);
      if (layout.insight) {
        expect(layout.price.top).toBeLessThan(layout.insight.top);
      }
    }

    await expect(card).toBeVisible();
  }

  async expectResultUnitScaling(
    expected: Record<"route" | "dates" | "price" | "insight", boolean>,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const scaling = await card.evaluate((element) => {
      const get = (selector: string) => {
        const node = element.querySelector(selector);
        if (!(node instanceof HTMLElement)) return null;
        return {
          scaled: node.dataset.scaled === "true",
          fontSize: parseFloat(getComputedStyle(node).fontSize),
          baseFontSize: Number(node.dataset.baseFontSize),
        };
      };

      return {
        route: get(".result-route"),
        dates: get(".result-dates"),
        price: get(".result-price"),
        insight: get(".price-insight"),
      };
    });

    for (const key of ["route", "dates", "price", "insight"] as const) {
      const unit = scaling[key];
      if (expected[key]) {
        expect(unit).not.toBeNull();
        expect(unit?.scaled).toBe(true);
        expect(unit?.fontSize).toBeGreaterThanOrEqual(10);
        expect(unit?.fontSize).toBeLessThan(unit?.baseFontSize ?? 0);
      } else if (unit) {
        expect(unit.scaled).toBe(false);
        expect(unit.fontSize).toBe(unit.baseFontSize);
      }
    }
  }

  async expectResultBadgeBesideRoute(
    label: string,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const layout = await card.evaluate((element, expectedLabel) => {
      const route = element.querySelector(".result-route");
      const title = route?.querySelector("strong");
      const badge = route?.querySelector(".flex-badge");

      if (!title || !badge) {
        throw new Error("Result route badge is missing");
      }

      const range = document.createRange();
      range.selectNodeContents(title);
      const firstLine = range.getClientRects()[0];
      const badgeBox = badge.getBoundingClientRect();

      return {
        badgeText: badge.textContent,
        badgeCenter: badgeBox.top + badgeBox.height / 2,
        routeLineCenter: firstLine
          ? firstLine.top + firstLine.height / 2
          : null,
        routeRight: title.getBoundingClientRect().right,
        badgeLeft: badgeBox.left,
      };
    }, label);

    expect(layout.badgeText).toBe(label);
    expect(layout.routeLineCenter).not.toBeNull();
    expect(
      Math.abs(layout.badgeCenter - (layout.routeLineCenter ?? 0)),
    ).toBeLessThanOrEqual(8);
    expect(layout.badgeLeft).toBeGreaterThanOrEqual(layout.routeRight);
  }

  async expectResultRouteLineCount(
    expectedCount: number,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const layout = await card.evaluate((element) => {
      const route = element.querySelector(".result-route");
      const title = route?.querySelector("strong");

      if (!route || !title) {
        throw new Error("Result route is missing");
      }

      const range = document.createRange();
      range.selectNodeContents(title);
      const lineTops = new Set(
        Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)),
      );
      const routeBox = route.getBoundingClientRect();
      const cardBox = element.getBoundingClientRect();

      return {
        lineCount: lineTops.size,
        routeLeft: routeBox.left,
        routeRight: routeBox.right,
        cardLeft: cardBox.left,
        cardRight: cardBox.right,
      };
    });

    expect(layout.lineCount).toBe(expectedCount);
    expect(layout.routeLeft).toBeGreaterThanOrEqual(layout.cardLeft);
    expect(layout.routeRight).toBeLessThanOrEqual(layout.cardRight);
  }

  async expectResultRoute(
    route: string,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const actualRoute = await card
      .locator(".result-route strong")
      .textContent();
    expect(actualRoute?.replace(/\u00a0/g, " ")).toBe(route);
  }

  async expectRouteCityAndCodeTogether(
    code: string,
    card: Locator = this.firstResult,
  ): Promise<void> {
    const lineCount = await card
      .locator(".route-city")
      .evaluateAll((cities, expectedCode) => {
        const city = cities.find((element) =>
          element.textContent?.endsWith(`(${expectedCode})`),
        );
        const text = city?.firstChild;
        if (!text || text.nodeType !== Node.TEXT_NODE) {
          throw new Error(`Route city for ${expectedCode} is missing`);
        }

        const content = text.textContent ?? "";
        const codeStart = content.lastIndexOf(`(${expectedCode})`);
        const wordStart = content.lastIndexOf(" ", codeStart - 2) + 1;
        const range = document.createRange();
        range.setStart(text, wordStart);
        range.setEnd(text, content.length);

        return new Set(
          Array.from(range.getClientRects()).map((rect) =>
            Math.round(rect.top),
          ),
        ).size;
      }, code);

    expect(lineCount).toBe(1);
  }

  async expectNoResultPriceInsight(
    card: Locator = this.firstResult,
  ): Promise<void> {
    await expect(card.locator(".price-insight")).toHaveCount(0);
  }

  async expectClearedDestinationWarning(): Promise<void> {
    await expect(this.searchValidationError).toHaveText(
      "⚠️ Destinations have been cleared. Please select again.",
    );
    await expect(this.oldDestinationLimitWarning).toHaveCount(0);
  }

  async expectErrorCardLayoutAtWidth(
    width: number,
  ): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });

    const layout = await this.searchValidationError.evaluate((warning) => {
      const container = warning.parentElement;

      if (!container) {
        throw new Error("Destination warning container is missing");
      }

      const warningBox = warning.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      const style = getComputedStyle(warning);
      const range = document.createRange();

      range.selectNodeContents(warning);

      return {
        warningCenter: warningBox.left + warningBox.width / 2,
        containerCenter: containerBox.left + containerBox.width / 2,
        warningWidth: warningBox.width,
        containerWidth: containerBox.width,
        warningScrollWidth: warning.scrollWidth,
        warningClientWidth: warning.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        textLineCount: range.getClientRects().length,
        textAlign: style.textAlign,
        width: style.width,
      };
    });

    expect(
      Math.abs(layout.warningCenter - layout.containerCenter),
    ).toBeLessThanOrEqual(1);
    expect(layout.warningWidth).toBeLessThanOrEqual(layout.containerWidth);
    expect(layout.warningScrollWidth).toBeLessThanOrEqual(
      layout.warningClientWidth,
    );
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.textLineCount).toBeGreaterThan(1);
    expect(layout.textAlign).toBe("center");
    expect(layout.width).not.toBe("100%");
    await expect(this.searchValidationError).toBeVisible();
  }

  async openAutocomplete(searchText: string): Promise<void> {
    await this.airportInput.click();
    await this.airportInput.fill(searchText);
    await this.expectAutocompleteOpen();
  }

  async getActiveAutocompleteItemIata(): Promise<string> {
    const text =
      (await this.activeAutocompleteItem.textContent())?.trim() ?? "";
    const match = text.match(/\(([A-Z]{3})\)/);

    if (!match) {
      throw new Error("No IATA found in active autocomplete item");
    }

    return match[1];
  }

  async selectAirportByEnter(searchText: string): Promise<void> {
    await this.airportInput.click();
    await this.airportInput.fill(searchText);
    await this.expectAutocompleteOpen();
    await this.airportInput.press("Enter");
  }

  async openOriginAutocomplete(query: string): Promise<void> {
    await this.originInput.fill(query);
    await expect(this.originAutocompleteList).toHaveClass(/open/);
    await expect(this.originAutocompleteItems.first()).toBeVisible();
  }

  async selectOrigin(code: string): Promise<void> {
    await this.openOriginAutocomplete(code);
    await this.originAutocompleteItems.filter({ hasText: `(${code})` }).click();
  }

  async selectOriginByEnter(query: string): Promise<void> {
    await this.openOriginAutocomplete(query);
    await this.originInput.press("Enter");
  }

  async selectOriginImmediatelyByEnter(query: string): Promise<void> {
    await this.originInput.fill(query);
    await this.originInput.press("Enter");
  }

  async expectAirportControlsDisabled(): Promise<void> {
    await expect(this.originInput).toBeDisabled();
    await expect(this.airportInput).toBeDisabled();
    await expect(this.searchButton).toBeDisabled();
  }

  async holdConfigRequest(): Promise<{
    waitUntilRequested: () => Promise<void>;
    release: () => void;
  }> {
    let release!: () => void;
    let requested!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const arrived = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await this.page.route("**/config", async (route) => {
      requested();
      await gate;
      await route.continue();
    });
    return { waitUntilRequested: () => arrived, release };
  }

  async expectOriginSelected(code: string): Promise<void> {
    await expect(this.originValue).toHaveValue(code);
    await expect(this.originInput).toHaveValue(new RegExp(`\\(${code}\\)$`));
  }

  async forceOriginValue(code: string): Promise<void> {
    await this.originValue.evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, code);
  }

  async blurOriginInput(): Promise<void> {
    await this.weekdaySelect.focus();
  }

  async expectSearchRequestOrigin(
    origin: string,
    destinations: string[],
    action: () => Promise<void>,
  ): Promise<void> {
    const pending = this.page.waitForRequest(
      (request) =>
        request.url().endsWith("/search-stream") && request.method() === "POST",
    );
    await action();
    const request = await pending;
    expect(request.postDataJSON()).toMatchObject({ origin, destinations });
  }

  async selectWeekdayOption(option: string): Promise<void> {
    await this.weekdaySelect.selectOption(option);
  }

  async selectWeekdayByName(weekDay: string): Promise<void> {
    await this.weekdaySelect.click();
    await this.typeWeekday(weekDay);
    await this.weekdaySelect.press("Enter");
  }

  async typeWeekday(weekDay: string): Promise<void> {
    await this.weekdaySelect.type(weekDay);
  }

  async blurStartDate(): Promise<void> {
    await this.startDateInput.blur();
  }

  async triggerSearchTwice(): Promise<void> {
    await this.page.evaluate(() => {
      const app = window as unknown as {
        search: () => Promise<void>;
      };

      void app.search();
      void app.search();
    });
  }

  async mockSearchAccessResponse(status: number, body: unknown): Promise<void> {
    await this.page.route("**/api/search-access", async (route) => {
      await route.fulfill({
        status,
        json: body,
      });
    });
  }

  async mockSearchAccess(
    plan: SearchPlan,
    overrides: Partial<SearchPolicy> = {},
  ): Promise<void> {
    await this.mockSearchAccessResponse(200, getSearchAccess(plan, overrides));
  }

  async mockSearchSession(
    plan: "registered" | "premium",
    isAdmin = false,
  ): Promise<void> {
    const token = "search-access-test-token";

    await this.page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        json: { success: true, token },
      });
    });

    await this.page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          user: {
            id: 1,
            email: "search@example.com",
            emailVerified: true,
            plan,
            isAdmin,
          },
        },
      });
    });

    await this.page.route("**/api/search-access", async (route) => {
      const authorization = route.request().headers().authorization;

      const currentPlan =
        authorization === `Bearer ${token}` ? plan : "anonymous";

      await route.fulfill({
        json: getSearchAccess(currentPlan),
      });
    });
  }

  async mockBookingPage(): Promise<void> {
    await this.page
      .context()
      .route("https://www.google.com/travel/flights**", async (route) => {
        await route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Booking page</title>",
        });
      });
  }

  async mockSearchSequence(responses: MockSearchResponse[]): Promise<{
    expectRequestCount: (expected: number) => Promise<void>;
  }> {
    let requestCount = 0;

    await this.page.route("**/search-stream", async (route) => {
      const response = responses[requestCount];
      requestCount++;

      if (!response) {
        await route.abort("failed");
        return;
      }

      const originCode = route.request().postDataJSON().origin ?? "BUD";
      const resultEvents = [response, ...(response.results ?? [])]
        .map((result) => {
          const flight = {
            origin: {
              code: originCode,
              ...(result.originCity ? { city: result.originCity } : {}),
            },
            destination: {
              ...(result.city ? { city: result.city } : {}),
              code: result.code,
            },
            departure: "2026-10-09",
            return: "2026-10-11",
            price: result.price,
            currency: "HUF",
            bookingUrl: "https://example.com/booking",
            resultType: result.resultType ?? "base",
            ...(result.priceInsight
              ? { priceInsight: result.priceInsight }
              : {}),
          };

          return `data: ${JSON.stringify(flight)}\n\n`;
        })
        .join("");
      const endEvent =
        response.completed === false ? "" : "event: end\ndata: done\n\n";

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: resultEvents + endEvent,
      });
    });

    return {
      expectRequestCount: async (expected: number): Promise<void> => {
        expect(requestCount).toBe(expected);
      },
    };
  }

  async mockConfigFailure(): Promise<void> {
    await this.page.route("**/config", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Internal server error",
        }),
      });
    });
  }

  async mockDestinationsFailure(
    mode: "http" | "network" | "json" | "shape" | "entry",
  ): Promise<void> {
    await this.page.route("**/destinations", async (route) => {
      if (mode === "network") {
        await route.abort("failed");
        return;
      }

      const bodies = {
        http: JSON.stringify({ error: "DB error" }),
        json: "{invalid-json",
        shape: JSON.stringify({ destinations: [] }),
        entry: JSON.stringify([null]),
      };

      await route.fulfill({
        status: mode === "http" ? 500 : 200,
        contentType: "application/json",
        body: bodies[mode],
      });
    });
  }

  async mockFlexSearch(resultType: "flex" | "fallback-flex"): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      const flight = {
        origin: { code: "BUD" },
        destination: {
          city: "Larnaca",
          code: "LCA",
        },
        departure: "2026-10-08",
        return: "2026-10-11",
        price: 25000,
        currency: "HUF",
        bookingUrl: "https://www.google.com/travel/flights?test",
        resultType,
        ...(resultType === "flex"
          ? {
              priceInsight: {
                percent: 20,
                basePrice: 31250,
              },
            }
          : {}),
      };

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          `data: ${JSON.stringify(flight)}\n\n` + "event: end\ndata: done\n\n",
      });
    });
  }

  async mockEmptySearch(): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ["event: end", "data: {}", "", ""].join("\n"),
      });
    });
  }

  async mockSearchServerError(): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Internal server error",
        }),
      });
    });
  }

  async mockSearchStreamError(): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: error\ndata: error\n\n",
      });
    });
  }

  async mockPendingSearch() {
    let requestCount = 0;
    let releaseResponse!: () => void;

    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await this.page.route("**/search-stream", async (route) => {
      requestCount++;
      await responseGate;

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: end\ndata: done\n\n",
      });
    });

    return {
      complete: () => releaseResponse(),

      expectRequestCount: async (expected: number): Promise<void> => {
        await expect.poll(() => requestCount).toBe(expected);
      },
    };
  }

  async mockSearchWithProviderFailure(includeResult = false): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      const flight = {
        destination: { city: "Amsterdam", code: "AMS" },
        departure: "2026-10-09",
        return: "2026-10-11",
        price: 30000,
        currency: "HUF",
        bookingUrl: "https://example.com/booking",
        resultType: "base",
      };

      const resultEvent = includeResult
        ? `data: ${JSON.stringify(flight)}\n\n`
        : "";

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          "event: fail\ndata: fail\n\n" +
          resultEvent +
          "event: end\ndata: done\n\n",
      });
    });
  }

  async expectPageTitle(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(text);
  }

  async expectAuthControlsVisible(): Promise<void> {
    await expect(
      this.authContainer.getByRole("button", {
        name: "Login",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      this.authContainer.getByRole("button", {
        name: "Register",
        exact: true,
      }),
    ).toBeVisible();
  }

  async expectOriginSuggestionAbsent(code: string): Promise<void> {
    await expect(
      this.originAutocompleteItems.filter({ hasText: `(${code})` }),
    ).toHaveCount(0);
  }

  async expectOriginSuggestionVisible(code: string): Promise<void> {
    await expect(
      this.originAutocompleteItems.filter({ hasText: `(${code})` }),
    ).toBeVisible();
  }

  async expectDestinationSuggestionAbsent(code: string): Promise<void> {
    await expect(
      this.autocompleteItem.filter({ hasText: `(${code})` }),
    ).toHaveCount(0);
  }

  async expectSelectedDestinationCount(count: number): Promise<void> {
    await expect(this.selectedDestinationBadges).toHaveCount(count);
  }

  async expectAutocompleteOpen(): Promise<void> {
    await expect(this.autocompleteList).toHaveClass(/open/);
  }

  async expectItemActive(index: number): Promise<void> {
    await expect(this.autocompleteItem.nth(index)).toHaveClass(/active/);
  }

  async expectAirportSelected(code: string): Promise<void> {
    await expect(
      this.selectedDestinationBadges.filter({
        hasText: new RegExp(`^${code}$`),
      }),
    ).toBeVisible();
  }

  async expectAirportSelectedOnlyOnce(code: string): Promise<void> {
    await expect(
      this.selectedDestinationBadges.filter({
        hasText: new RegExp(`^${code}$`),
      }),
    ).toHaveCount(1);
  }

  async expectAirportNotSelected(code: string): Promise<void> {
    await expect(
      this.selectedDestinationBadges.filter({
        hasText: new RegExp(`^${code}$`),
      }),
    ).toHaveCount(0);
  }

  async expectStartDateMinimum(value: string): Promise<void> {
    await expect(this.startDateInput).toHaveAttribute("min", value);
  }

  async searchAndExpectStartDate(value: string): Promise<void> {
    const pendingRequest = this.page.waitForRequest(
      (request) =>
        request.url().endsWith("/search-stream") && request.method() === "POST",
    );

    await this.searchButton.click();

    const request = await pendingRequest;

    expect(request.postDataJSON()).toMatchObject({
      startDate: value,
    });
  }

  async expectSavedSearchStartDate(value: string): Promise<void> {
    await expect
      .poll(() =>
        this.page.evaluate(() => {
          const stored = sessionStorage.getItem("flightFinder.lastSearch.v1");

          if (!stored) return null;

          return JSON.parse(stored).parameters?.startDate;
        }),
      )
      .toBe(value);
  }

  async expectResultsFooterText(text: string): Promise<void> {
    await expect(this.resultsFooter.filter({ hasText: text })).toBeVisible();
  }

  async expectRestoredSearchVisible(): Promise<void> {
    await expect(this.results.getByText(/^Saved search:/)).toBeVisible();
  }

  async expectResultsEmpty(): Promise<void> {
    await expect(this.results).toBeEmpty();
  }

  async expectFlexibleDateResult(): Promise<void> {
    const card = this.flexCard.first();

    await expect(card).toBeVisible();
    await expect(
      card.getByText("Flexible Dates", { exact: true }),
    ).toBeVisible();

    const priceInsight = card.locator(".price-insight");

    await expect(priceInsight).toContainText(
      /% cheaper than the original dates/,
    );

    await expect(priceInsight).toContainText(/HUF [\d,]+/);
  }

  async expectAlternativeDateResult(): Promise<void> {
    const card = this.fallbackFlexCard.first();

    await expect(card).toBeVisible();
    await expect(
      card.getByText("Alternative Dates", { exact: true }),
    ).toBeVisible();

    await expect(card.locator(".price-insight")).toHaveCount(0);
  }

  async expectNoResults(): Promise<void> {
    await expect(this.noResultsCard).toBeVisible();

    await expect(this.noResultsCard).toContainText("No flights found");

    await expect(this.noResultsCard).toContainText(
      "Try different dates, more nights, or another destination.",
    );
  }

  async clickFirstResultAndGetBookingPage(): Promise<Page> {
    const popupPromise = this.page.context().waitForEvent("page");

    await this.firstResult.click();

    return popupPromise;
  }

  async expectBookingPageOpened(popup: Page): Promise<void> {
    await expect(popup).toHaveURL(/google\.com\/travel\/flights/);

    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  }

  async expectSearchUnavailable(): Promise<void> {
    const message = this.page.locator(".search-unavailable-card");

    await expect(message).toBeVisible();
    await expect(message).toContainText("Search results unavailable");
    await expect(message).toContainText("Please try again.");
    await expect(this.noResultsCard).toHaveCount(0);
  }

  async expectDestinationsUnavailable(): Promise<void> {
    await expect(this.page.locator("#destinations-error")).toHaveText(
      "Destinations could not be loaded. Please reload the page to try again.",
    );

    await expect(this.page.locator("#destinations-error")).toBeVisible();

    await expect(this.airportInput).toBeDisabled();
    await expect(this.searchButton).toBeDisabled();
  }

  async expectNoSearchUnavailableMessage(): Promise<void> {
    await expect(this.page.locator(".search-unavailable-card")).toHaveCount(0);
  }

  async expectOnlySessionExpirationError(): Promise<void> {
    await expect(this.sessionMessage).toBeVisible();
    await expect(this.sessionMessage).toHaveText(
      "⚠️ Your session has expired. Please sign in again.",
    );
    await expect(this.sessionMessage).toHaveClass(/error-card/);
    await expect(this.errorCards).toHaveCount(1);
    await expect
      .poll(() =>
        this.sessionMessage.evaluate((message) => message.parentElement?.id),
      )
      .toBe("selected-container");
  }

  async dismissSessionMessage(): Promise<void> {
    await this.sessionMessage.click();
    await expect(this.sessionMessage).toBeHidden();
  }

  async mockAnonymousSearchAccess(maxDestinations = 1): Promise<void> {
    await this.mockSearchAccess("anonymous", { maxDestinations });
  }

  async refreshSearchAccess(): Promise<void> {
    await this.page.evaluate(() => {
      void (window as Window & { refreshSearchAccess: () => Promise<void> })
        .refreshSearchAccess();
    });
  }

  async rememberSharedErrorElement(): Promise<void> {
    await this.sessionMessage.evaluate((message) => {
      (window as Window & { sharedErrorElement?: Element }).sharedErrorElement =
        message;
    });
  }

  async expectSharedErrorElementReused(): Promise<void> {
    await expect
      .poll(() =>
        this.sessionMessage.evaluate(
          (message) =>
            (window as Window & { sharedErrorElement?: Element })
              .sharedErrorElement === message,
        ),
      )
      .toBe(true);
  }

  async expectPrivateSearchDataRemoved(): Promise<void> {
    await expect
      .poll(() =>
        this.page.evaluate(() =>
          sessionStorage.getItem("flightFinder.lastSearch.v1"),
        ),
      )
      .toBeNull();
  }
}
