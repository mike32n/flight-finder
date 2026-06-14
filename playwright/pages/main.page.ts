import { Locator, Page, expect } from "@playwright/test";

export default class MainPage {
  readonly page: Page;

  readonly toggleThemeButton: Locator;
  readonly searchButton: Locator;
  readonly plusButton: Locator;
  readonly minusButton: Locator;

  readonly airportInput: Locator;
  readonly autocompleteList: Locator;
  readonly selectedContainer: Locator;
  readonly autocompleteItem: Locator;

  constructor(page: Page) {
    this.page = page;

    this.toggleThemeButton = page.getByRole("button", {
      name: /toggle theme/i,
    });

    this.searchButton = page.getByRole("button", {
      name: /search/i,
    });

    this.plusButton = page.getByRole("button", {
      name: "+",
    });

    this.minusButton = page.getByRole("button", {
      name: "-",
    });

    this.airportInput = page.getByRole("textbox", {
      name: "Type city or IATA code...",
    });

    this.autocompleteList = page.locator("#autocomplete-list");

    this.selectedContainer = page.locator("#selected-container");

    this.autocompleteItem = page.locator(".autocomplete-item");
  }

  async clickToggleTheme(): Promise<void> {
    await this.toggleThemeButton.click();
  }

  async clickAirportInput(): Promise<void> {
    await this.airportInput.click();
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
    startIndex: number,
    down: number,
    up: number,
  ): Promise<string> {
    await this.openAutocomplete(searchText);

    const iata = await this.getAutocompleteItemIata(startIndex);

    await this.navigateAutocomplete(down, up);
    await this.expectItemActive(startIndex);

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

  async selectActiveItemIata(index: number): Promise<string> {
    const iata = await this.getAutocompleteItemIata(index);
    await this.expectItemActive(index);
    return iata;
  }

  async expectAutocompleteOpen(): Promise<void> {
    await expect(this.autocompleteList).toContainClass("open");
  }

  async expectItemActive(index: number): Promise<void> {
    await expect(this.autocompleteItem.nth(index)).toHaveClass(/active/);
  }

  async expectAirportSelected(code: string): Promise<void> {
    await expect(
      this.selectedContainer.filter({ hasText: code }),
    ).toBeVisible();
  }

  async selectAirportByEnter(searchText: string): Promise<void> {
    await this.clickAirportInput();
    await this.searchAirport(searchText);
    await this.expectAutocompleteOpen();
    await this.pressEnter();
  }
}
