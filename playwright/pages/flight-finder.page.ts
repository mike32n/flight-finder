import { Locator, Page, expect } from "@playwright/test";

export default class MainPage {
  readonly page: Page;

  readonly heading: Locator;

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
  readonly nightsInput: Locator;
  readonly startDateInput: Locator;
  readonly autocompleteList: Locator;
  readonly selectedContainer: Locator;
  readonly selectedDestinationBadges: Locator;
  readonly noAirportsSelectedWarning: Locator;
  readonly searchValidationError: Locator;
  readonly autocompleteItem: Locator;
  readonly activeAutocompleteItem: Locator;
  readonly firstResult: Locator;
  readonly results: Locator;
  readonly resultCards: Locator;
  readonly resultsFooter: Locator;

  readonly flexCard: Locator;
  readonly fallbackFlexCard: Locator;
  readonly flexBadge: Locator;
  readonly priceInsight: Locator;

  readonly noResultsCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { level: 1 });

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

    this.nightsInput = page.locator("#nights");

    this.startDateInput = page.locator("#start-date");

    this.autocompleteList = page.locator("#autocomplete-list");

    this.selectedContainer = page.locator("#selected-container");

    this.selectedDestinationBadges =
      this.selectedContainer.locator(".iata-badge");

    this.noAirportsSelectedWarning =
      this.selectedContainer.locator(".error-card");

    this.searchValidationError = page.locator("#search-validation-error");

    this.autocompleteItem = this.autocompleteList.locator(".autocomplete-item");

    this.activeAutocompleteItem = this.autocompleteList.locator(
      ".autocomplete-item.active",
    );

    this.results = page.locator("#results");
    this.resultCards = this.results.locator(".card");
    this.firstResult = this.resultCards.first();

    this.resultsFooter = page.locator("#results-footer");

    this.flexCard = page.locator(".flex-card").filter({
      has: page.getByText("Flexible dates", { exact: true }),
    });

    this.fallbackFlexCard = page.locator(".flex-card").filter({
      has: page.getByText("Alternative dates", { exact: true }),
    });

    this.flexBadge = page.locator(".flex-badge");
    this.priceInsight = page.locator(".price-insight");
    this.noResultsCard = page.locator(".no-results-card");
  }

  async setStoredDarkTheme(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
  }

  async clickToggleTheme(): Promise<void> {
    await this.toggleThemeButton.click();
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

  async expectThemeButtonText(text: string): Promise<void> {
    await expect(this.toggleThemeButton).toHaveText(text);
  }

  async clickAirportInput(): Promise<void> {
    await this.airportInput.click();
  }

  async clickWeekdaySelect(): Promise<void> {
    await this.weekdaySelect.click();
  }

  async clickIncrementButton(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.incrementButton.click();
    }
  }

  async clickDecrementButton(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.decrementButton.click();
    }
  }

  async clickSearchButton(): Promise<void> {
    await this.searchButton.click();
  }

  async clickSelectedContainer(code: string): Promise<void> {
    await this.selectedContainer.getByText(code).click();
  }

  async clickSearchValidationError(): Promise<void> {
    await this.searchValidationError.click();
  }

  async searchAirport(searchText: string): Promise<void> {
    await this.airportInput.fill(searchText);
  }

  async pressEnter(): Promise<void> {
    await this.airportInput.press("Enter");
  }

  async pressArrowDown(element: Locator, times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await element.press("ArrowDown");
    }
  }

  async pressArrowUp(element: Locator, times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await element.press("ArrowUp");
    }
  }

  async pressAirportArrowDown(times = 1): Promise<void> {
    await this.pressArrowDown(this.airportInput, times);
  }

  async pressWeekdayArrowDown(times = 1): Promise<void> {
    await this.pressArrowDown(this.weekdaySelect, times);
  }

  async pressWeekdayArrowUp(times = 1): Promise<void> {
    await this.pressArrowUp(this.weekdaySelect, times);
  }

  async openAutocomplete(searchText: string): Promise<void> {
    await this.clickAirportInput();
    await this.searchAirport(searchText);
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

  async getAutocompleteItemText(index: number): Promise<string> {
    const item = this.autocompleteItem.nth(index);
    return (await item.textContent())?.trim() ?? "";
  }

  async selectAirportByEnter(searchText: string): Promise<void> {
    await this.clickAirportInput();
    await this.searchAirport(searchText);
    await this.expectAutocompleteOpen();
    await this.pressEnter();
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

  async cancelOriginEdit(): Promise<void> {
    await this.originInput.press("Escape");
  }

  async blurOriginInput(): Promise<void> {
    await this.weekdaySelect.focus();
  }

  async expectOriginDropdownHidden(): Promise<void> {
    await expect(this.originAutocompleteList).toBeHidden();
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
    await this.clickWeekdaySelect();
    await this.typeWeekday(weekDay);
    await this.pressEnter();
  }

  async typeWeekday(weekDay: string): Promise<void> {
    await this.weekdaySelect.type(weekDay);
  }

  async fillNights(value: string): Promise<void> {
    await this.nightsInput.fill(value);
  }

  async fillStartDate(value: string): Promise<void> {
    await this.startDateInput.fill(value);
  }

  async blurStartDate(): Promise<void> {
    await this.startDateInput.blur();
  }

  async clickFirstResult(): Promise<void> {
    await this.firstResult.click();
  }

  async clickLogoutButton(): Promise<void> {
    await this.logoutButton.click();
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

  async mockSearchSequence(
    responses: Array<{
      city: string;
      code: string;
      price: number;
      completed?: boolean;
    }>,
  ): Promise<{
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

      const flight = {
        origin: {
          code: route.request().postDataJSON().origin ?? "BUD",
        },
        destination: {
          city: response.city,
          code: response.code,
        },
        departure: "2026-10-09",
        return: "2026-10-11",
        price: response.price,
        currency: "HUF",
        bookingUrl: "https://example.com/booking",
        resultType: "base",
      };

      const resultEvent = `data: ${JSON.stringify(flight)}\n\n`;
      const endEvent =
        response.completed === false ? "" : "event: end\ndata: done\n\n";

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: resultEvent + endEvent,
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

  async mockFallbackFlexSearch(): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          "event: data",
          'data: {"destination":{"city":"Larnaca","code":"LCA"},"departure":"2026-10-08","return":"2026-10-11","price":25000,"currency":"HUF","bookingUrl":"https://www.google.com/travel/flights?test","resultType":"fallback-flex"}',
          "",
          "event: end",
          "data: {}",
          "",
          "",
        ].join("\n"),
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

  async mockUnexpectedStreamClose(): Promise<void> {
    await this.page.route("**/search-stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          "event: data",
          'data: {"destination":{"city":"Amsterdam","code":"AMS"},"departure":"2026-10-09","return":"2026-10-11","price":30000,"currency":"HUF","bookingUrl":"https://example.com"}',
          "",
          "",
        ].join("\n"),
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

  async expectAirportInputEnabled(): Promise<void> {
    await expect(this.airportInput).toBeEnabled();
  }

  async expectSearchValidationErrorText(message: string): Promise<void> {
    await expect(this.searchValidationError).toHaveText(message);
  }

  async expectSearchValidationErrorHidden(): Promise<void> {
    await expect(this.searchValidationError).toBeHidden();
  }

  async expectAutocompleteOpen(): Promise<void> {
    await expect(this.autocompleteList).toHaveClass(/open/);
  }

  async expectItemActive(index: number): Promise<void> {
    await expect(this.autocompleteItem.nth(index)).toHaveClass(/active/);
  }

  async expectAirportSelected(code: string): Promise<void> {
    await expect(
      this.selectedContainer.filter({ hasText: code }),
    ).toBeVisible();
  }

  async expectAirportSelectedOnlyOnce(code: string): Promise<void> {
    await expect(this.selectedContainer.filter({ hasText: code })).toHaveCount(
      1,
    );
  }

  async expectAirportNotSelected(code: string): Promise<void> {
    await expect(this.selectedContainer.filter({ hasText: code })).toHaveCount(
      0,
    );
  }

  async expectWeekdaySelected(weekDay: string): Promise<void> {
    await expect(this.weekdaySelect.filter({ hasText: weekDay })).toBeVisible();
  }

  async expectNightsValue(value: string): Promise<void> {
    await expect(this.nightsInput).toHaveValue(value);
  }

  async expectStartDate(value: string): Promise<void> {
    await expect(this.startDateInput).toHaveValue(value);
  }

  async expectStartDateMinimum(value: string): Promise<void> {
    await expect(this.startDateInput).toHaveAttribute("min", value);
  }

  async searchAndExpectStartDate(value: string): Promise<void> {
    const pendingRequest = this.page.waitForRequest(
      (request) =>
        request.url().endsWith("/search-stream") && request.method() === "POST",
    );

    await this.clickSearchButton();

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

  async expectNoAirportsSelectedWarning(): Promise<void> {
    await expect(this.noAirportsSelectedWarning).toBeVisible();
  }

  async expectAirportInputDisabled(): Promise<void> {
    await expect(this.airportInput).toBeDisabled();
  }

  async expectFirstResultVisible(): Promise<void> {
    await expect(this.firstResult).toBeVisible();
  }

  async expectResultsFooterText(text: string): Promise<void> {
    await expect(this.resultsFooter.filter({ hasText: text })).toBeVisible();
  }

  async expectResultTexts(texts: string[]): Promise<void> {
    await expect(this.resultCards).toHaveText(texts);
  }

  async expectRestoredSearchVisible(): Promise<void> {
    await expect(this.results.getByText(/^Saved search:/)).toBeVisible();
  }

  async expectResultsEmpty(): Promise<void> {
    await expect(this.results).toBeEmpty();
  }

  async expectWeekdayValue(value: string): Promise<void> {
    await expect(this.weekdaySelect).toHaveValue(value);
  }

  async expectFlexibleDateResult(): Promise<void> {
    const card = this.flexCard.first();

    await expect(card).toBeVisible();
    await expect(
      card.getByText("Flexible dates", { exact: true }),
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
      card.getByText("Alternative dates", { exact: true }),
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
    const popupPromise = this.page.waitForEvent("popup");

    await this.firstResult.click();

    return popupPromise;
  }

  async expectBookingPageOpened(popup: Page): Promise<void> {
    await expect(popup).toHaveURL(/google\.com\/travel\/flights/);
  }

  async expectSearchError(message: string): Promise<void> {
    await expect(this.results).toContainText(message);
  }

  async expectSearchButtonDisabled(): Promise<void> {
    await expect(this.searchButton).toBeDisabled();
  }

  async expectSearchButtonEnabled(): Promise<void> {
    await expect(this.searchButton).toBeEnabled();
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
}
