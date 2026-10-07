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

  readonly airportInput: Locator;
  readonly weekdaySelect: Locator;
  readonly nightsInput: Locator;
  readonly autocompleteList: Locator;
  readonly selectedContainer: Locator;
  readonly noAirportsSelectedWarning: Locator;
  readonly autocompleteItem: Locator;
  readonly activeAutocompleteItem: Locator;
  readonly firstResult: Locator;
  readonly results: Locator;
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
      name: "Type city or IATA code...",
    });

    this.weekdaySelect = page.locator("#weekday");

    this.nightsInput = page.locator("#nights");

    this.autocompleteList = page.locator("#autocomplete-list");

    this.selectedContainer = page.locator("#selected-container");

    this.noAirportsSelectedWarning = page.locator(".error-card");

    this.autocompleteItem = page.locator(".autocomplete-item");

    this.activeAutocompleteItem = page.locator(".autocomplete-item.active");

    this.firstResult = page.locator(".card").first();

    this.results = page.locator("#results");

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

  async clickToggleTheme(): Promise<void> {
    await this.toggleThemeButton.click();
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

  async expectPageTitle(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(text);
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
}
