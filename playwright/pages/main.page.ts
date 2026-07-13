import { Locator, Page, expect } from "@playwright/test";

export default class MainPage {
  readonly page: Page;

  readonly heading: Locator;

  readonly toggleThemeButton: Locator;
  readonly searchButton: Locator;
  readonly incrementButton: Locator;
  readonly decrementButton: Locator;

  readonly airportInput: Locator;
  readonly weekdaySelect: Locator;
  readonly nightsInput: Locator;
  readonly autocompleteList: Locator;
  readonly selectedContainer: Locator;
  readonly autocompleteItem: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { level: 1 });

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

    this.autocompleteItem = page.locator(".autocomplete-item");

    this.resultsFooter = page.locator("#results-footer");
  }

  async clickToggleTheme(): Promise<void> {
    await this.toggleThemeButton.click();
  }

  async clickAirportInput(): Promise<void> {
    await this.airportInput.click();
  }

  async clickSelectedContainer(code: string): Promise<void> {
    await this.selectedContainer.getByText(code).click();
  }

  async clickIncrementButton(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.incrementButton.click();
    }
  }

  async clickSearchButton(): Promise<void> {
    await this.searchButton.click();
  }

  async searchAirport(searchText: string): Promise<void> {
    await this.airportInput.fill(searchText);
  }

  async pressEnter(): Promise<void> {
    await this.airportInput.press("Enter");
  }

  async pressArrowDown(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.airportInput.press("ArrowDown");
    }
  }

  async pressArrowUp(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.airportInput.press("ArrowUp");
    }
  }

  async openAutocomplete(searchText: string): Promise<void> {
    await this.clickAirportInput();
    await this.searchAirport(searchText);
    await this.expectAutocompleteOpen();
  }

  async navigateAutocomplete(stepsDown: number, stepsUp = 0): Promise<void> {
    for (let i = 0; i < stepsDown; i++) {
      await this.pressArrowDown();
    }

    for (let i = 0; i < stepsUp; i++) {
      await this.pressArrowUp();
    }
  }

  async selectAirportWithArrowKeys(
    searchText: string,
    activeIndex: number,
    down: number,
    up: number,
  ): Promise<string> {
    await this.openAutocomplete(searchText);

    const iata = await this.getAutocompleteItemIata(activeIndex);

    await this.navigateAutocomplete(down, up);
    await this.expectItemActive(activeIndex);

    await this.pressEnter();

    return iata;
  }

  async getAutocompleteItemText(index: number): Promise<string> {
    const item = this.autocompleteItem.nth(index);
    return (await item.textContent())?.trim() ?? "";
  }

  async getAutocompleteItemIata(index: number): Promise<string> {
    const text = await this.getAutocompleteItemText(index);
    const match = text.match(/\(([A-Z]{3})\)/);
    if (!match) throw new Error("No IATA found");
    return match[1];
  }

  async selectAirportByEnter(searchText: string): Promise<void> {
    await this.clickAirportInput();
    await this.searchAirport(searchText);
    await this.expectAutocompleteOpen();
    await this.pressEnter();
  }

  async selectActiveItemIata(index: number): Promise<string> {
    const iata = await this.getAutocompleteItemIata(index);
    await this.expectItemActive(index);
    return iata;
  }

  async selectWeekdayOption(option: string): Promise<void> {
    await this.weekdaySelect.selectOption(option);
  }

  async expectPageTitle(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text));
  }

  async expectVisible(element: Locator): Promise<void> {
    await expect(element).toBeVisible();
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

  async expectResultsFooterText(text: string): Promise<void> {
    await expect(this.resultsFooter.filter({ hasText: text })).toBeVisible();
  }
}
