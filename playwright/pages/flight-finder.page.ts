import { Locator, Page, expect } from "@playwright/test";
import {
  getSearchAccess,
  SearchPlan,
  SearchPolicy,
} from "../data/search-access";

declare global {
  interface Window {
    refreshSearchAccess: () => Promise<void>;
    releaseProgressiveSearch?: () => void;
    progressiveSearchOpen?: boolean;
  }
}

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

export type HeaderControlLayout = {
  authCenter: number;
  authLeft: number;
  authHeight: number;
  authWidth: number;
  headerHeight: number;
  formTop: number;
  formLeft: number;
  formWidth: number;
  formHeight: number;
  authButtonLeft: number;
  authButtonTop: number;
  authButtonWidth: number;
  authButtonHeight: number;
  themeLeft: number;
  themeTop: number;
  themeRight: number;
};

type NightsControlMeasurement = {
  viewport: number;
  value: string;
  rowWidth: number;
  inputWidth: number;
  textAreaWidth: number;
  textWidth: number;
  buttonWidths: number[];
};

export default class MainPage {
  readonly page: Page;
  private documentLoadCount = 0;
  readonly heading: Locator;
  readonly appShell: Locator;
  readonly appHeader: Locator;
  readonly searchView: Locator;
  readonly adminView: Locator;
  readonly searchAccessStatus: Locator;
  readonly premiumBadge: Locator;
  readonly smartFlexPreference: Locator;
  readonly smartFlexText: Locator;
  readonly smartFlexPreferenceError: Locator;
  readonly sessionMessage: Locator;
  readonly errorCards: Locator;

  readonly authContainer: Locator;
  readonly logoutButton: Locator;
  readonly accountInfoButton: Locator;
  readonly accountEmail: Locator;

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
    page.on("load", () => {
      this.documentLoadCount++;
    });
    this.heading = page.getByRole("heading", { level: 1 });
    this.appShell = page.locator("#app-shell");
    this.appHeader = page.locator("#app-header");
    this.searchView = page.locator("#search-view");
    this.adminView = page.locator("#admin-view");
    this.searchAccessStatus = page.locator("#search-access-status");
    this.premiumBadge = page.locator("#premium-badge");
    this.smartFlexPreference = this.appHeader.getByRole("checkbox", {
      name: "Smart Flex",
      exact: true,
    });
    this.smartFlexText = this.appHeader.locator("#smart-flex-preference-label");
    this.smartFlexPreferenceError = this.appHeader.locator(
      "#smart-flex-preference-error",
    );
    this.sessionMessage = page.locator("#search-validation-error");
    this.errorCards = page.locator(".error-card");

    this.authContainer = page.locator("#auth-container");
    this.accountInfoButton = this.authContainer.getByRole("button", {
      name: "Show account information",
      exact: true,
    });
    this.accountEmail = this.authContainer.locator("#auth-user-email");
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

  async expectNightsControlLayoutAtWidth(
    width: number,
  ): Promise<NightsControlMeasurement[]> {
    await this.page.setViewportSize({ width, height: 900 });
    await expect(this.nightsInput).toBeEnabled();
    const measurements: NightsControlMeasurement[] = [];

    for (const value of ["10", "30"]) {
      await this.nightsInput.fill(value);
      if (value === "30") {
        await this.decrementButton.click();
        await expect(this.nightsInput).toHaveValue("29");
        await this.incrementButton.click();
        await expect(this.nightsInput).toHaveValue(value);
        await this.nightsInput.focus();
      }
      await this.page.mouse.move(0, 0);
      await expect(this.decrementButton).toHaveCSS("transform", "none");
      await expect(this.incrementButton).toHaveCSS("transform", "none");
      await expect(this.nightsInput).toHaveValue(value);

      const layout = await this.nightsInput.evaluate((input) => {
        if (!(input instanceof HTMLInputElement) || input.type !== "number") {
          throw new Error("Nights control must be a number input");
        }
        const row = input.closest(".stepper");
        if (!row) throw new Error("Nights stepper is missing");
        const inputBox = input.getBoundingClientRect();
        const style = getComputedStyle(input);
        const inputInsets =
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight) +
          parseFloat(style.borderLeftWidth) +
          parseFloat(style.borderRightWidth);
        // Native number inputs expose different clientWidth boxes across engines.
        const textAreaWidth = Math.min(
          inputBox.width - inputInsets,
          input.clientWidth,
        );
        const probe = document.createElement("span");
        probe.style.cssText = "position:fixed;visibility:hidden;white-space:pre";
        for (const property of [
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "font-stretch",
          "font-variant-numeric",
          "font-feature-settings",
          "font-kerning",
          "letter-spacing",
        ]) {
          probe.style.setProperty(property, style.getPropertyValue(property));
        }
        document.body.appendChild(probe);
        probe.textContent = input.value;
        const textWidth = probe.getBoundingClientRect().width;
        probe.textContent = "00";
        const twoCharacterWidth = probe.getBoundingClientRect().width;
        probe.remove();

        const textCenter = inputBox.left + inputBox.width / 2;
        const textUnobstructed = [-0.5, 0, 0.5].every(
          (offset) =>
            document.elementFromPoint(
              textCenter + offset * textWidth,
              inputBox.top + inputBox.height / 2,
            ) === input,
        );
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
          };
        };
        const buttons = [...row.querySelectorAll("button")].map((button) => {
          const buttonStyle = getComputedStyle(button);
          const text = document.createRange();
          text.selectNodeContents(button);
          return {
            ...box(button),
            flexShrink: buttonStyle.flexShrink,
            naturalWidth:
              text.getBoundingClientRect().width +
              parseFloat(buttonStyle.paddingLeft) +
              parseFloat(buttonStyle.paddingRight) +
              parseFloat(buttonStyle.borderLeftWidth) +
              parseFloat(buttonStyle.borderRightWidth),
          };
        });
        return {
          row: box(row),
          input: box(input),
          buttons,
          textAreaWidth,
          textWidth,
          twoCharacterWidth,
          inputInsets,
          textUnobstructed,
          inputScrollLeft: input.scrollLeft,
          gap: parseFloat(getComputedStyle(row).columnGap),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
        };
      });

      expect(layout.buttons).toHaveLength(2);
      expect(layout.gap).toBe(6);
      expect(layout.inputInsets).toBe(26);
      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
      for (const control of [...layout.buttons, layout.input]) {
        expect(control.left).toBeGreaterThanOrEqual(layout.row.left - 0.01);
        expect(control.right).toBeLessThanOrEqual(layout.row.right + 0.01);
        expect(control.top).toBeGreaterThanOrEqual(layout.row.top - 0.01);
        expect(control.bottom).toBeLessThanOrEqual(layout.row.bottom + 0.01);
      }
      expect(layout.buttons[0].right).toBeLessThanOrEqual(layout.input.left);
      expect(layout.input.right).toBeLessThanOrEqual(layout.buttons[1].left);
      if (width <= 768) {
        expect(layout.input.width).toBeGreaterThanOrEqual(72);
        expect(layout.textAreaWidth).toBeGreaterThanOrEqual(layout.textWidth);
        expect(layout.textUnobstructed).toBe(true);
        expect(layout.inputScrollLeft).toBe(0);
        for (const button of layout.buttons) {
          expect(button.width).toBeCloseTo(76, 2);
          expect(button.flexShrink).toBe("0");
        }
      } else {
        expect(layout.input.width).toBeCloseTo(
          layout.twoCharacterWidth + layout.inputInsets,
          1,
        );
        for (const button of layout.buttons) {
          expect(button.width).toBeCloseTo(button.naturalWidth, 1);
          expect(button.width).toBeLessThan(76);
        }
      }
      measurements.push({
        viewport: width,
        value,
        rowWidth: layout.row.width,
        inputWidth: layout.input.width,
        textAreaWidth: layout.textAreaWidth,
        textWidth: layout.textWidth,
        buttonWidths: layout.buttons.map((button) => button.width),
      });
    }
    return measurements;
  }

  async expectSmartFlexPreference(
    checked: boolean,
    enabled = false,
  ): Promise<void> {
    await expect(this.smartFlexPreference).toBeVisible();
    if (enabled) {
      await expect(this.smartFlexPreference).toBeEnabled();
    } else {
      await expect(this.smartFlexPreference).toBeDisabled();
    }
    await expect(this.smartFlexPreference).toBeChecked({ checked });
  }

  async expectSearchAccessReady(): Promise<void> {
    await this.expectSearchAccessStatusHidden();
    await expect(this.searchButton).toBeEnabled();
  }

  async expectSearchAccessStatusHidden(): Promise<void> {
    await expect(this.searchAccessStatus).toBeHidden();
    await expect(this.searchAccessStatus).toHaveText("");
  }

  async expectSearchAccessStatusMessage(
    message: string | RegExp,
  ): Promise<void> {
    await expect(this.searchAccessStatus).toBeVisible();
    await expect(this.searchAccessStatus).toContainText(message);
  }

  async expectDestinationPlaceholder(value: string): Promise<void> {
    await expect(this.airportInput).toBeVisible();
    await expect(this.airportInput).toHaveValue("");
    await expect(this.airportInput).toHaveAttribute("placeholder", value);
    await expect(this.originInput).toHaveAttribute(
      "placeholder",
      "Type city or IATA code...",
    );
  }

  async expectPremiumBadge(visible: boolean): Promise<void> {
    if (visible) {
      await expect(this.premiumBadge).toBeVisible();
      await expect(this.premiumBadge).toHaveText("PREMIUM");
    } else {
      await expect(this.premiumBadge).toBeHidden();
    }
  }

  async expectPremiumHeadingLayoutAtWidth(width: number): Promise<void> {
    const mobile = width <= 768;
    await this.page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => this.page.evaluate(() => window.innerWidth))
      .toBe(width);
    await this.expectPremiumBadge(true);
    await expect(this.heading).toHaveCSS("font-size", "32px");
    await expect(this.premiumBadge).toHaveCSS(
      "font-size",
      mobile ? "9.6px" : "12.8px",
    );
    await this.page.mouse.move(0, 0);

    const layout = await this.heading.evaluate((heading) => {
      const title = heading.querySelector("span");
      const badge = heading.querySelector("#premium-badge");
      if (!title || !badge) throw new Error("Heading content is missing");
      const headingBox = heading.getBoundingClientRect();
      const headingStyle = getComputedStyle(heading);
      const availableLeft =
        headingBox.left +
        parseFloat(headingStyle.borderLeftWidth) +
        parseFloat(headingStyle.paddingLeft);
      const availableRight =
        headingBox.right -
        parseFloat(headingStyle.borderRightWidth) -
        parseFloat(headingStyle.paddingRight);
      const bounds = (rect: DOMRect) => ({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      });
      const measure = (element: Element, name: string) => {
        const style = getComputedStyle(element);
        const range = document.createRange();
        range.selectNodeContents(element);
        const visibleBounds = {
          left: Math.max(0, availableLeft),
          right: Math.min(
            document.documentElement.clientWidth,
            availableRight,
          ),
          top: Math.max(0, headingBox.top),
          bottom: Math.min(
            document.documentElement.clientHeight,
            headingBox.bottom,
          ),
        };

        for (
          let ancestor: Element | null = element;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const ancestorStyle = getComputedStyle(ancestor);
          const ancestorBox = ancestor.getBoundingClientRect();
          if (ancestorStyle.overflowX !== "visible") {
            const left = ancestorBox.left + ancestor.clientLeft;
            visibleBounds.left = Math.max(visibleBounds.left, left);
            visibleBounds.right = Math.min(
              visibleBounds.right,
              left + ancestor.clientWidth,
            );
          }
          if (ancestorStyle.overflowY !== "visible") {
            const top = ancestorBox.top + ancestor.clientTop;
            visibleBounds.top = Math.max(visibleBounds.top, top);
            visibleBounds.bottom = Math.min(
              visibleBounds.bottom,
              top + ancestor.clientHeight,
            );
          }
        }

        return {
          name,
          box: bounds(element.getBoundingClientRect()),
          textBoxes: Array.from(range.getClientRects(), bounds),
          visibleBounds,
          fontSize: parseFloat(style.fontSize),
          padding: [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
          ].map(parseFloat),
        };
      };

      return {
        availableCenter: (availableLeft + availableRight) / 2,
        title: measure(title, "Heading text"),
        badge: measure(badge, "Premium badge"),
      };
    });

    // DOMRect gaps retain subpixels; ancestor client dimensions round to pixels.
    const gapTolerance = 0.05;
    const boundsTolerance = 0.5;
    const titleBox = layout.title.box;
    const badgeBox = layout.badge.box;
    expect(
      Math.min(titleBox.bottom, badgeBox.bottom) -
        Math.max(titleBox.top, badgeBox.top),
      "Heading and Premium badge must overlap vertically, not wrap",
    ).toBeGreaterThan(0);
    expect(
      Math.abs(
        (titleBox.top + titleBox.bottom) / 2 -
          (badgeBox.top + badgeBox.bottom) / 2,
      ),
      "Heading and Premium badge vertical centers",
    ).toBeLessThanOrEqual(boundsTolerance);
    expect(badgeBox.left).toBeGreaterThan(titleBox.right);
    expect(
      Math.abs(badgeBox.left - titleBox.right - 8),
      "Rendered heading-to-badge gap must be 8px",
    ).toBeLessThanOrEqual(gapTolerance);
    expect(
      Math.abs(
        (Math.min(titleBox.left, badgeBox.left) +
          Math.max(titleBox.right, badgeBox.right)) /
          2 -
          layout.availableCenter,
      ),
      "Combined heading and Premium badge must be centered",
    ).toBeLessThanOrEqual(boundsTolerance);
    expect(layout.title.fontSize).toBeCloseTo(32, 2);
    expect(layout.badge.fontSize).toBeCloseTo(mobile ? 9.6 : 12.8, 2);
    expect(layout.badge.padding).toEqual(
      mobile ? [1, 2, 1, 2] : [2, 7, 2, 7],
    );

    for (const element of [layout.title, layout.badge]) {
      expect(element.textBoxes.length, `${element.name} text`).toBeGreaterThan(0);
      expect(
        Math.min(...element.textBoxes.map((box) => box.bottom)) -
          Math.max(...element.textBoxes.map((box) => box.top)),
        `${element.name} text must remain on one visual row`,
      ).toBeGreaterThan(0);
      for (const [index, box] of [
        element.box,
        ...element.textBoxes,
      ].entries()) {
        const description =
          `${element.name} ${index === 0 ? "element" : `text fragment ${index}`}`;
        expect(box.left, `${description} left clipping`).toBeGreaterThanOrEqual(
          element.visibleBounds.left - boundsTolerance,
        );
        expect(box.right, `${description} right clipping`).toBeLessThanOrEqual(
          element.visibleBounds.right + boundsTolerance,
        );
        expect(box.top, `${description} top clipping`).toBeGreaterThanOrEqual(
          element.visibleBounds.top - boundsTolerance,
        );
        expect(box.bottom, `${description} bottom clipping`).toBeLessThanOrEqual(
          element.visibleBounds.bottom + boundsTolerance,
        );
      }
    }
  }

  async toggleSmartFlexPreference(): Promise<void> {
    await this.smartFlexPreference.click();
  }

  async activateSmartFlexWithSpace(): Promise<void> {
    await this.smartFlexPreference.focus();
    await expect(this.smartFlexPreference).toBeFocused();
    await expect(this.smartFlexPreference).toHaveCSS("outline-style", "solid");
    await expect(this.smartFlexPreference).toHaveCSS("outline-width", "2px");
    await this.smartFlexPreference.press("Space");
  }

  watchSmartFlexSaves() {
    const requests: Record<string, unknown>[] = [];
    this.page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/auth/me" &&
        request.method() === "PATCH"
      ) {
        requests.push(request.postDataJSON());
      }
    });
    return {
      expectCount: async (count: number) => {
        expect(requests).toHaveLength(count);
      },
      expectSavedPreference: async (checked: boolean, count: number) => {
        await expect.poll(() => requests.length).toBe(count);
        expect(requests[count - 1]).toMatchObject({
          smartFlexPreference: checked,
        });
        await this.expectSmartFlexPreference(checked, true);
      },
    };
  }

  async expectSmartFlexTextInteractionAtWidth(width: number): Promise<void> {
    await this.expectHeaderLayoutAtWidth(width);
    const checked = await this.smartFlexPreference.isChecked();
    const disabled = await this.smartFlexPreference.isDisabled();
    const measure = () =>
      this.appShell.evaluate((shell) =>
        Array.from(shell.querySelectorAll(
          "#app-header, .smart-flex-preference, #smart-flex-preference, #smart-flex-preference-label, .header-controls, #search-view .form",
        )).map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      );
    const before = await measure();
    await this.smartFlexText.hover();
    await expect(this.smartFlexText).toHaveAttribute(
      "title",
      "Looks for cheaper flights on nearby dates.",
    );
    await expect(this.smartFlexPreference).toHaveAttribute("type", "checkbox");
    await expect(this.smartFlexPreference).toHaveAttribute(
      "aria-labelledby",
      "smart-flex-preference-label",
    );
    await expect(this.smartFlexPreference).toHaveAccessibleName("Smart Flex");
    await expect(this.smartFlexPreference).toHaveAccessibleDescription(
      "Looks for cheaper flights on nearby dates.",
    );
    expect(await measure()).toEqual(before);
    await this.smartFlexText.click();
    await this.expectSmartFlexPreference(checked, !disabled);
    expect(await measure()).toEqual(before);
  }

  async expectDisabledSmartFlexIgnoresPointer(): Promise<void> {
    await expect(this.smartFlexPreference).toBeDisabled();
    const box = await this.smartFlexPreference.boundingBox();
    if (!box) throw new Error("Smart Flex switch is missing");
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await this.expectSmartFlexPreference(false);
  }

  async mockSmartFlexSaveFailure(status: 400 | 500): Promise<void> {
    await this.page.route("**/api/auth/me", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback();
        return;
      }

      await route.fulfill({ status, json: { success: false } });
    });
  }

  async clearSmartFlexSaveFailure(): Promise<void> {
    await this.page.unroute("**/api/auth/me");
  }

  async expectSmartFlexSaveError(outcome: "saved" | "confirmed"): Promise<void> {
    await expect(this.smartFlexPreferenceError).toBeVisible();
    await expect(this.smartFlexPreferenceError).toContainText(
      `Smart Flex preference could not be ${outcome}.`,
    );
    await expect(this.smartFlexPreferenceError).toHaveRole("alert");
    await expect(this.smartFlexPreference).toHaveAttribute(
      "aria-describedby",
      "smart-flex-preference-description smart-flex-preference-error",
    );
    await expect(this.smartFlexPreference).toHaveAccessibleDescription(
      new RegExp(
        `^Looks for cheaper flights on nearby dates\\. Smart Flex preference could not be ${outcome}\\.`,
      ),
    );
    await expect(this.appHeader.getByRole("alert")).toHaveCount(1);
  }

  async expectSmartFlexSaveErrorHidden(): Promise<void> {
    await expect(this.smartFlexPreferenceError).toBeHidden();
  }

  async expectSmartFlexErrorLayoutAtWidth(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
    await expect(this.smartFlexPreferenceError).toBeVisible();
    const layout = await this.appHeader.evaluate((header) => {
      const feedback = header.querySelector("#smart-flex-preference-error");
      const controls = header.querySelector(".main-page-header");
      if (!(feedback instanceof HTMLElement) || !controls) {
        throw new Error("Smart Flex feedback or header controls are missing");
      }
      const feedbackBox = feedback.getBoundingClientRect();
      const controlsBox = controls.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      return {
        top: feedbackBox.top,
        bottom: feedbackBox.bottom,
        left: feedbackBox.left,
        right: feedbackBox.right,
        controlsBottom: controlsBox.bottom,
        headerBottom: headerBox.bottom,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        scrollWidth: feedback.scrollWidth,
        clientWidth: feedback.clientWidth,
      };
    });
    expect(layout.top).toBeGreaterThanOrEqual(layout.controlsBottom);
    expect(layout.bottom).toBeLessThanOrEqual(layout.headerBottom + 1);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  }

  async expectAppStructurePrepared(): Promise<void> {
    await expect(this.appShell.locator(":scope > #app-header")).toHaveCount(1);
    await expect(this.appShell.locator(":scope > #search-view")).toHaveCount(1);
    await expect(this.appShell.locator(":scope > #admin-view")).toHaveCount(1);

    await expect(this.appHeader.locator("#admin-link")).toHaveCount(1);
    await expect(this.appHeader.locator("#search-access-status")).toHaveCount(
      1,
    );
    await expect(this.appHeader.locator("#auth-container")).toHaveCount(1);
    await expect(this.appHeader.locator("#theme-button")).toHaveCount(1);

    await expect(this.searchView.locator("#selected-container")).toHaveCount(1);
    await expect(this.searchView.locator(".form")).toHaveCount(1);
    await expect(this.searchView.locator("#results")).toHaveCount(1);

    await expect(this.adminView).toBeHidden();
    await expect(this.adminView.locator("#admin-content")).toHaveCount(1);
    await expect(this.adminView.locator("#policy-form-anonymous")).toHaveCount(
      1,
    );
    await expect(this.adminView.locator("#policy-form-registered")).toHaveCount(
      1,
    );
    await expect(this.adminView.locator("#policy-form-premium")).toHaveCount(1);
    await expect(this.adminView.locator("#plan-policies-table")).toHaveCount(1);

    const authModalOutsideApp = await this.appShell.evaluate((shell) => {
      const modal = document.getElementById("auth-modal");
      return modal !== null && !shell.contains(modal);
    });

    expect(authModalOutsideApp).toBe(true);
  }

  async expectAccountDisclosureHidden(): Promise<void> {
    await expect(this.accountEmail).toBeHidden();
    await expect(this.accountInfoButton).toHaveAttribute("aria-expanded", "false");
  }

  async expectAccountEmail(email: string): Promise<void> {
    await expect(this.accountEmail).toBeVisible();
    await expect(this.accountEmail).toHaveText(email);
    await expect(this.accountEmail).toHaveRole("tooltip");
    await expect(this.authContainer.getByRole("tooltip")).toHaveCount(1);
    await expect(this.accountInfoButton).toHaveAttribute("aria-expanded", "true");
    await expect(this.accountInfoButton).toHaveAccessibleDescription(email);
    expect(await this.accountEmail.getAttribute("title")).toBeNull();
  }

  async hoverAccountDisclosure(email: string): Promise<void> {
    await this.page.mouse.move(0, 0);
    await this.accountInfoButton.hover();
    await this.expectAccountEmail(email);
  }

  async hoverAccountEmail(email: string): Promise<void> {
    const box = await this.accountEmail.boundingBox();
    if (!box) throw new Error("Account disclosure must be visible before hovering it.");
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 10,
    });
    await this.expectAccountEmail(email);
  }

  async leaveAccountDisclosure(): Promise<void> {
    await this.page.mouse.move(0, 0);
    await this.expectAccountDisclosureHidden();
  }

  async focusAccountDisclosure(email: string): Promise<void> {
    await this.page.mouse.move(0, 0);
    await this.smartFlexPreference.focus();
    await this.page.keyboard.press("Tab");
    await expect(this.accountInfoButton).toBeFocused();
    await this.expectAccountEmail(email);
  }

  async moveFocusOutsidePinnedAccountDisclosure(email: string): Promise<void> {
    await expect(this.accountInfoButton).toBeFocused();
    await this.smartFlexPreference.focus();
    await expect(this.smartFlexPreference).toBeFocused();
    await this.expectAccountEmail(email);
  }

  async activateAccountDisclosure(key?: "Enter" | "Space"): Promise<void> {
    if (key) {
      await expect(this.accountInfoButton).toBeFocused();
      await this.accountInfoButton.press(key);
      await expect(this.accountInfoButton).toBeFocused();
    } else {
      await this.accountInfoButton.click();
    }
  }

  async dismissAccountDisclosureWithEscape(): Promise<void> {
    const wasFocused = await this.accountInfoButton.evaluate(
      (button) => document.activeElement === button,
    );
    await this.page.keyboard.press("Escape");
    await this.expectAccountDisclosureHidden();
    if (wasFocused) await expect(this.accountInfoButton).toBeFocused();
  }

  async dismissAccountDisclosureOutside(): Promise<void> {
    await this.heading.click();
    await this.expectAccountDisclosureHidden();
  }

  async tabOutOfAccountDisclosure(): Promise<void> {
    await this.page.keyboard.press("Tab");
    await expect(this.logoutButton).toBeFocused();
    await this.expectAccountDisclosureHidden();
  }

  async tapAccountDisclosure(): Promise<void> {
    await this.accountInfoButton.tap();
  }

  async tapOutsideAccountDisclosure(): Promise<void> {
    await this.heading.tap();
    await this.expectAccountDisclosureHidden();
  }

  async expectAccountDisclosureRemoved(previousEmail: string): Promise<void> {
    await expect(this.accountInfoButton).toHaveCount(0);
    await expect(this.accountEmail).toHaveCount(0);
    await expect(this.authContainer).not.toContainText(previousEmail);
  }

  async expectAccountDisclosureFits(unbrokenSegment?: string): Promise<void> {
    const layout = await this.accountEmail.evaluate((email, segment) => {
      const box = email.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(email);
      const textRects = [...range.getClientRects()];
      let segmentLineCount = 0;
      if (segment) {
        const text = email.firstChild;
        if (!(text instanceof Text) || !text.data.startsWith(segment)) {
          throw new Error("Account email must start with the expected unbroken segment.");
        }
        range.setStart(text, 0);
        range.setEnd(text, segment.length);
        segmentLineCount = new Set(
          [...range.getClientRects()].map((rect) => rect.top),
        ).size;
      }
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
        documentWidth: document.documentElement.scrollWidth,
        clientWidth: email.clientWidth,
        scrollWidth: email.scrollWidth,
        segmentLineCount,
        textFits: textRects.every(
          (text) =>
            text.left >= box.left - 0.5 &&
            text.right <= box.right + 0.5 &&
            text.top >= box.top - 0.5 &&
            text.bottom <= box.bottom + 0.5,
        ),
      };
    }, unbrokenSegment);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.left).toBeGreaterThanOrEqual(7.5);
    expect(layout.top).toBeGreaterThanOrEqual(7.5);
    expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth - 7.5);
    expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight - 7.5);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.textFits).toBe(true);
    if (unbrokenSegment) expect(layout.segmentLineCount).toBeGreaterThan(1);
  }

  async expectHeaderLayoutAtWidth(
    width: number,
    statusText?: string,
  ): Promise<HeaderControlLayout> {
    const loadCount = this.documentLoadCount;
    await this.page.setViewportSize({ width, height: 900 });

    if (statusText !== undefined) {
      await this.searchAccessStatus.evaluate((element, text) => {
        element.textContent = text;
        (element as HTMLElement).hidden = false;
      }, statusText);
    }

    await expect(this.authContainer.locator(":scope > *")).toBeVisible();
    await expect(this.smartFlexPreference).toBeVisible();
    await expect(this.searchAccessStatus).toHaveCount(1);
    await expect(this.searchAccessStatus).toHaveRole("status");
    if (statusText === undefined) {
      await expect(this.searchAccessStatus).toBeHidden();
      await expect(this.searchAccessStatus).toHaveText("");
    } else {
      await expect(this.searchAccessStatus).toBeVisible();
      await expect(this.searchAccessStatus).toHaveText(statusText);
    }

    const layout = await this.appHeader.evaluate((header) => {
      const admin = header.querySelector("#admin-link");
      const status = header.querySelector("#search-access-status");
      const preferenceContainer = header.querySelector(".smart-flex-preference");
      const theme = header.querySelector("#theme-button");
      const controls = header.querySelector(".header-controls");
      const auth = header.querySelector("#auth-container");
      const authContent = auth?.firstElementChild;
      const mainHeader = header.querySelector(".main-page-header");
      const container = header.closest(".container");
      const form = container?.querySelector("#search-view .form");
      const login = header.querySelector("#login-btn");
      const logout = header.querySelector("#logout-btn");
      const authButton = login ?? logout;
      const email = header.querySelector("#auth-user-email");
      const settings = header.querySelector(".header-search-settings");
      const feedback = header.querySelector("#smart-flex-preference-error");

      if (
        !admin ||
        !status ||
        !preferenceContainer ||
        !theme ||
        !controls ||
        !auth ||
        !authButton ||
        !settings ||
        !feedback ||
        !mainHeader ||
        !container ||
        !form
      ) {
        throw new Error("Main page header elements are missing");
      }

      const headerBox = header.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      const adminBox = admin.getBoundingClientRect();
      const adminStyle = getComputedStyle(admin);
      const statusBox = status.getBoundingClientRect();
      const preferenceBox = preferenceContainer.getBoundingClientRect();
      const formBox = form.getBoundingClientRect();
      const themeBox = theme.getBoundingClientRect();
      const themeStyle = getComputedStyle(theme);
      const authBox = auth.getBoundingClientRect();
      const authContentBox = authContent?.getBoundingClientRect();
      const loginBox = login?.getBoundingClientRect();
      const logoutBox = logout?.getBoundingClientRect();
      const authButtonBox = authButton.getBoundingClientRect();
      const authButtonStyle = getComputedStyle(authButton);
      const authCard = auth.querySelector(".auth-user-card");
      const info = auth.querySelector(".auth-user-info");
      const icon = auth.querySelector(".auth-user-icon");
      const infoBox = info?.getBoundingClientRect();
      const iconBox = icon?.getBoundingClientRect();
      const authCardBox = authCard?.getBoundingClientRect();
      const authBar = auth.querySelector(".auth-bar");
      const emailStyle = email ? getComputedStyle(email) : null;
      const authCardStyle = authCard ? getComputedStyle(authCard) : null;
      const authBarStyle = authBar ? getComputedStyle(authBar) : null;
      const statusStyle = getComputedStyle(status);
      const mainHeaderStyle = getComputedStyle(mainHeader);
      const containerStyle = getComputedStyle(container);
      const textRange = document.createRange();
      textRange.selectNodeContents(status);
      const statusTextRects = Array.from(textRange.getClientRects());
      const overlaps = (first: DOMRect, second: DOMRect) =>
        first.width > 0 &&
        first.height > 0 &&
        second.width > 0 &&
        second.height > 0 &&
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;

      return {
        headerScrollWidth: header.scrollWidth,
        headerClientWidth: header.clientWidth,
        headerLeft: headerBox.left,
        headerRight: headerBox.right,
        headerHeight: headerBox.height,
        formTop: formBox.top,
        formLeft: formBox.left,
        formWidth: formBox.width,
        formHeight: formBox.height,
        containerContentWidth:
          container.clientWidth -
          parseFloat(containerStyle.paddingLeft) -
          parseFloat(containerStyle.paddingRight),
        adminRight: adminBox.right,
        adminLeft: adminBox.left,
        adminTop: adminBox.top,
        adminTopOffset: adminBox.top - containerBox.top,
        adminLeftOffset: adminBox.left - containerBox.left,
        adminWidth: parseFloat(adminStyle.width),
        adminHeight: adminBox.height,
        adminPosition: adminStyle.position,
        adminVisible: getComputedStyle(admin).display !== "none",
        headerColumnGap: parseFloat(mainHeaderStyle.columnGap),
        rootFontSize: parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ),
        settingsFontSize: parseFloat(getComputedStyle(settings).fontSize),
        preferenceFontSize: parseFloat(
          getComputedStyle(preferenceContainer).fontSize,
        ),
        feedbackFontSize: parseFloat(getComputedStyle(feedback).fontSize),
        statusLeft: statusBox.left,
        statusRight: statusBox.right,
        statusTop: statusBox.top,
        statusCenter: statusBox.top + statusBox.height / 2,
        statusWhiteSpace: statusStyle.whiteSpace,
        statusFontSize: parseFloat(statusStyle.fontSize),
        statusOverflowX: statusStyle.overflowX,
        statusTextOverflow: statusStyle.textOverflow,
        statusScrollWidth: status.scrollWidth,
        statusClientWidth: status.clientWidth,
        statusSingleLine:
          statusTextRects.length > 0 &&
          statusTextRects.every(
            (rect) => Math.abs(rect.top - statusTextRects[0].top) < 0.5,
          ),
        statusPosition: statusStyle.position,
        preferenceLeft: preferenceBox.left,
        preferenceRight: preferenceBox.right,
        preferenceCenter: preferenceBox.left + preferenceBox.width / 2,
        preferenceOverlapsStatus: overlaps(preferenceBox, statusBox),
        preferenceOverlapsAdmin: overlaps(preferenceBox, adminBox),
        preferenceOverlapsTheme: overlaps(preferenceBox, themeBox),
        preferenceOverlapsAuth: overlaps(preferenceBox, authBox),
        themeLeft: themeBox.left,
        themeTop: themeBox.top,
        themeTopOffset: themeBox.top - containerBox.top,
        themeRight: themeBox.right,
        themeRightOffset: containerBox.right - themeBox.right,
        themeWidth: themeBox.width,
        themeHeight: themeBox.height,
        themePosition: themeStyle.position,
        authOverlapsAdmin: overlaps(authBox, adminBox),
        authOverlapsTheme: overlaps(authBox, themeBox),
        authTop: authBox.top,
        authLeft: authBox.left,
        authRight: authBox.right,
        authLeftClearance: authBox.left - (headerBox.left + themeBox.width),
        authRightClearance: themeBox.left - authBox.right,
        authThemeGap: themeBox.left - authBox.right,
        authHeight: authBox.height,
        authPosition: getComputedStyle(auth).position,
        loginHeight: loginBox?.height ?? 0,
        logoutHeight: logoutBox?.height ?? 0,
        authButtonLeft: authButtonBox.left,
        authButtonTop: authButtonBox.top,
        authButtonRight: authButtonBox.right,
        authButtonWidth: authButtonBox.width,
        authButtonHeight: authButtonBox.height,
        authButtonFontSize: parseFloat(authButtonStyle.fontSize),
        authButtonFontFamily: authButtonStyle.fontFamily,
        authButtonScrollWidth: authButton.scrollWidth,
        authButtonClientWidth: authButton.clientWidth,
        authButtonCount: auth.querySelectorAll("#login-btn, #logout-btn").length,
        registerCount: header.querySelectorAll("#register-btn").length,
        authContentPosition: authContent
          ? getComputedStyle(authContent).position
          : null,
        loginWidth: loginBox?.width ?? 0,
        loginScrollWidth: login?.scrollWidth ?? 0,
        loginClientWidth: login?.clientWidth ?? 0,
        loginPosition: login ? getComputedStyle(login).position : null,
        logoutPosition: logout ? getComputedStyle(logout).position : null,
        logoutWidth: logoutBox?.width ?? 0,
        logoutPadding: logout ? getComputedStyle(logout).padding : null,
        userInfoWidth: info?.getBoundingClientRect().width ?? 0,
        userInfoLeft: infoBox?.left ?? 0,
        userInfoRight: infoBox?.right ?? 0,
        userInfoTop: infoBox?.top ?? 0,
        userInfoHeight: infoBox?.height ?? 0,
        userInfoCenter: infoBox ? infoBox.top + infoBox.height / 2 : 0,
        userInfoTitle: info?.getAttribute("title") ?? "",
        visibleUserLabels: auth.querySelectorAll(".auth-user-label").length,
        iconWidth: iconBox?.width ?? 0,
        iconLeft: iconBox?.left ?? 0,
        iconRight: iconBox?.right ?? 0,
        iconCenter: iconBox ? iconBox.top + iconBox.height / 2 : 0,
        authCardWidth: authCardBox?.width ?? 0,
        authCardHeight: authCardBox?.height ?? 0,
        authCardScrollWidth: authCard?.scrollWidth ?? 0,
        authCardClientWidth: authCard?.clientWidth ?? 0,
        authCardDisplay: authCardStyle?.display ?? null,
        authCardFlexWrap: authCardStyle?.flexWrap ?? null,
        authCardGap: authCardStyle?.gap ?? null,
        authBarPadding: authBarStyle?.padding ?? null,
        authCardPadding: authCardStyle?.padding ?? null,
        authCardBorder: authCardStyle?.borderWidth ?? null,
        logoutLeft: logoutBox?.left ?? 0,
        logoutTop: logoutBox?.top ?? 0,
        authWidth: authBox.width,
        authCenter: authBox.left + authBox.width / 2,
        availableBetweenCorners: themeBox.left - adminBox.right,
        authContentWidth: authContentBox?.width ?? 0,
        emailTitle: email?.getAttribute("title") ?? "",
        emailText: email?.textContent ?? "",
        emailHidden: email instanceof HTMLElement ? email.hidden : false,
        emailPosition: emailStyle?.position ?? "",
        authContentHeight: authContentBox?.height ?? 0,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    if (statusText !== undefined) {
      expect(layout.statusWhiteSpace).toBe("nowrap");
      expect(layout.statusOverflowX).toBe("hidden");
      expect(layout.statusTextOverflow).toBe("ellipsis");
      expect(layout.statusSingleLine).toBe(true);
      expect(layout.statusPosition).toBe("static");
      expect(layout.statusLeft).toBeGreaterThanOrEqual(layout.headerLeft);
      expect(layout.statusRight).toBeLessThanOrEqual(layout.preferenceLeft);
    }
    expect(layout.preferenceRight).toBeLessThanOrEqual(layout.headerRight);
    expect(layout.preferenceCenter).toBeCloseTo(
      (layout.headerLeft + layout.headerRight) / 2,
      0,
    );
    if (statusText !== undefined) {
      expect(layout.preferenceOverlapsStatus).toBe(false);
    }
    expect(layout.preferenceOverlapsAdmin).toBe(false);
    expect(layout.preferenceOverlapsTheme).toBe(false);
    expect(layout.preferenceOverlapsAuth).toBe(false);
    expect(layout.themePosition).toBe("static");
    expect(layout.authPosition).toBe("static");
    expect(layout.authContentPosition).toBe("static");
    if (layout.loginPosition !== null) {
      expect(layout.loginPosition).toBe("static");
    }
    if (layout.logoutPosition !== null) {
      expect(layout.logoutPosition).toBe("static");
    }
    expect(layout.headerScrollWidth).toBeLessThanOrEqual(
      layout.headerClientWidth + 1,
    );
    expect(layout.headerClientWidth).toBeCloseTo(
      layout.containerContentWidth,
      0,
    );
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    const expectedAuthWidth = 177.203125;
    expect(layout.authWidth).toBeCloseTo(expectedAuthWidth, 2);
    expect(layout.authContentWidth).toBeCloseTo(layout.authWidth, 2);
    expect(layout.authHeight).toBeCloseTo(layout.themeHeight, 2);
    expect(layout.authOverlapsAdmin).toBe(false);
    expect(layout.authOverlapsTheme).toBe(false);
    expect(layout.authTop).toBeCloseTo(layout.themeTop, 0);
    expect(layout.authButtonCount).toBe(1);
    expect(layout.registerCount).toBe(0);
    expect(layout.authButtonWidth).toBeCloseTo(72, 2);
    expect(layout.authButtonHeight).toBeCloseTo(32, 2);
    expect(layout.authButtonTop).toBeCloseTo(layout.themeTop, 2);
    expect(layout.authButtonRight).toBeCloseTo(layout.authRight - 8, 2);
    expect(layout.authButtonScrollWidth).toBeLessThanOrEqual(
      layout.authButtonClientWidth,
    );
    expect(layout.authButtonFontFamily).toBe("Arial, sans-serif");
    for (const [element, fontSize] of Object.entries({
      status: layout.statusFontSize,
      smartFlex: layout.preferenceFontSize,
      authButton: layout.authButtonFontSize,
      smartFlexError: layout.feedbackFontSize,
    })) {
      expect(fontSize, `${element} font size`).toBeCloseTo(
        layout.rootFontSize * 0.9,
        2,
      );
    }
    expect(layout.settingsFontSize).toBeCloseTo(layout.rootFontSize, 2);
    expect(layout.themeRight).toBeCloseTo(layout.headerRight, 0);
    expect(layout.themeWidth).toBeCloseTo(32, 0);
    expect(layout.themeHeight).toBeCloseTo(32, 0);
    expect(layout.themeTopOffset).toBeCloseTo(layout.themeRightOffset, 0);
    expect(layout.themeTopOffset).toBeCloseTo(30, 0);

    if (layout.adminVisible) {
      expect(layout.adminPosition).toBe("static");
      expect(layout.adminLeft).toBeCloseTo(layout.headerLeft, 0);
      expect(layout.adminTop).toBeCloseTo(layout.themeTop, 0);
      expect(layout.adminWidth).toBeCloseTo(32, 0);
      expect(layout.adminHeight).toBeCloseTo(32, 0);
      expect(layout.adminTopOffset).toBeCloseTo(layout.adminLeftOffset, 0);
      expect(layout.adminTopOffset).toBeCloseTo(30, 0);
      expect(layout.authWidth).toBeLessThanOrEqual(
        layout.availableBetweenCorners + 0.01,
      );
    }

    if (width <= 768) {
      const expectedLeftClearance =
        layout.headerClientWidth - layout.authWidth - 2 * layout.themeWidth;
      expect(expectedLeftClearance).toBeGreaterThanOrEqual(0);
      expect(layout.authLeftClearance).toBeCloseTo(expectedLeftClearance, 1);
      expect(layout.authRightClearance).toBeCloseTo(0, 2);
      expect(layout.authRight).toBeCloseTo(layout.themeLeft, 2);
      if (statusText !== undefined) {
        expect(layout.statusLeft).toBeCloseTo(layout.headerLeft, 0);
        expect(layout.authTop + layout.authHeight).toBeLessThanOrEqual(
          layout.statusTop,
        );
      }
      if (layout.adminVisible) {
        const availableBetweenCorners =
          layout.headerClientWidth - layout.adminWidth - layout.themeWidth;
        expect(layout.availableBetweenCorners).toBeCloseTo(
          availableBetweenCorners,
          2,
        );
        expect(layout.authWidth).toBeLessThanOrEqual(
          availableBetweenCorners + 0.01,
        );
        expect(layout.authLeft).toBeGreaterThanOrEqual(layout.adminRight);
        expect(layout.authRight).toBeLessThanOrEqual(layout.themeLeft);
      }
    } else {
      if (statusText !== undefined) {
        expect(layout.statusCenter).toBeCloseTo(
          layout.authTop + layout.authHeight / 2,
          0,
        );
        expect(layout.adminRight).toBeLessThanOrEqual(layout.statusLeft);
        expect(layout.statusRight).toBeLessThanOrEqual(layout.authLeft);
      }
      expect(layout.authThemeGap).toBeCloseTo(layout.headerColumnGap, 1);
    }

    if (layout.logoutWidth > 0) {
      expect(layout.visibleUserLabels).toBe(0);
      expect(layout.emailHidden).toBe(true);
      expect(layout.userInfoTitle).toBe("");
      expect(layout.emailTitle).toBe("");
      expect(layout.emailText.length).toBeGreaterThan(0);
      expect(layout.emailPosition).toBe("fixed");
      await expect(this.accountInfoButton).toHaveRole("button");
      await expect(this.accountInfoButton).toHaveAccessibleName(
        "Show account information",
      );
      await expect(this.accountInfoButton).toHaveAccessibleDescription(
        layout.emailText,
      );
      await expect(this.accountInfoButton).toHaveAttribute(
        "aria-controls",
        "auth-user-email",
      );
      await expect(this.accountInfoButton).toHaveAttribute(
        "aria-describedby",
        "auth-user-email",
      );
      await expect(this.accountInfoButton.locator(".auth-user-icon")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(this.accountInfoButton.locator(".auth-user-icon")).toHaveText(
        "🔐",
      );
      const iconFontSize = await this.accountInfoButton
        .locator(".auth-user-icon")
        .evaluate((icon) => parseFloat(getComputedStyle(icon).fontSize));
      expect(iconFontSize).toBeCloseTo(19.2, 4);
      expect(await this.accountInfoButton.getAttribute("title")).toBeNull();
      await this.expectAccountDisclosureHidden();
      await expect(this.accountInfoButton).toHaveCSS("width", "32px");
      await expect(this.accountInfoButton).toHaveCSS("height", "32px");
      expect(layout.logoutHeight).toBeCloseTo(layout.themeHeight, 2);
      expect(layout.authCardDisplay).toBe("flex");
      expect(layout.authCardFlexWrap).toBe("nowrap");
      expect(layout.authCardGap).toBe("8px");
      expect(layout.authCardWidth).toBeCloseTo(layout.authWidth, 2);
      expect(layout.authCardHeight).toBeCloseTo(layout.authHeight, 2);
      expect(layout.authHeight).toBeCloseTo(layout.themeHeight, 2);
      expect(layout.authContentHeight).toBeCloseTo(layout.authHeight, 2);
      expect(layout.authCardScrollWidth).toBeLessThanOrEqual(
        layout.authCardClientWidth + 1,
      );
      expect(layout.authCardPadding).toBe("0px 8px");
      expect(layout.authCardBorder).toBe("0px");
      expect(layout.logoutPadding).toBe("0px 10px");
      expect(layout.userInfoWidth).toBeGreaterThan(0);
      expect(layout.userInfoCenter).toBeCloseTo(
        layout.authTop + layout.authHeight / 2,
        2,
      );
      expect(layout.iconCenter).toBeCloseTo(
        layout.authTop + layout.authHeight / 2,
        2,
      );
      expect(layout.userInfoRight).toBeLessThanOrEqual(layout.logoutLeft);
      expect(layout.iconLeft).toBeGreaterThanOrEqual(layout.userInfoLeft);
      expect(layout.iconRight).toBeLessThanOrEqual(layout.userInfoRight);
    }

    if (layout.loginWidth > 0) {
      expect(layout.authBarPadding).toBe("0px 8px");
      expect(layout.authContentHeight).toBeCloseTo(layout.authHeight, 2);
      expect(layout.loginHeight).toBeCloseTo(layout.themeHeight, 2);
      expect(layout.loginScrollWidth).toBeLessThanOrEqual(
        layout.loginClientWidth,
      );
    }

    if (statusText !== undefined && width === 320) {
      expect(layout.statusScrollWidth).toBeGreaterThan(layout.statusClientWidth);
    }

    expect(this.documentLoadCount).toBe(loadCount);
    return {
      authCenter: layout.authCenter,
      authLeft: layout.authLeft,
      authHeight: layout.authHeight,
      authWidth: layout.authWidth,
      headerHeight: layout.headerHeight,
      formTop: layout.formTop,
      formLeft: layout.formLeft,
      formWidth: layout.formWidth,
      formHeight: layout.formHeight,
      authButtonLeft: layout.authButtonLeft,
      authButtonTop: layout.authButtonTop,
      authButtonWidth: layout.authButtonWidth,
      authButtonHeight: layout.authButtonHeight,
      themeLeft: layout.themeLeft,
      themeTop: layout.themeTop,
      themeRight: layout.themeRight,
    };
  }

  async expectHeaderControlsMatch(
    expected: HeaderControlLayout,
  ): Promise<void> {
    const layout = await this.appHeader.evaluate((header) => {
      const auth = header.querySelector("#auth-container");
      const theme = header.querySelector("#theme-button");
      const authButton = auth?.querySelector("#login-btn, #logout-btn");
      const form = header
        .closest(".container")
        ?.querySelector("#search-view .form");

      if (!auth || !theme || !form || !authButton) {
        throw new Error("Header controls or search form are missing");
      }

      const authBox = auth.getBoundingClientRect();
      const themeBox = theme.getBoundingClientRect();
      const formBox = form.getBoundingClientRect();
      const authButtonBox = authButton.getBoundingClientRect();

      return {
        authCenter: authBox.left + authBox.width / 2,
        authLeft: authBox.left,
        authHeight: authBox.height,
        authWidth: authBox.width,
        headerHeight: header.getBoundingClientRect().height,
        formTop: formBox.top,
        formLeft: formBox.left,
        formWidth: formBox.width,
        formHeight: formBox.height,
        authButtonLeft: authButtonBox.left,
        authButtonTop: authButtonBox.top,
        authButtonWidth: authButtonBox.width,
        authButtonHeight: authButtonBox.height,
        themeLeft: themeBox.left,
        themeTop: themeBox.top,
        themeRight: themeBox.right,
      };
    });

    expect(layout.authCenter).toBeCloseTo(expected.authCenter, 0);
    expect(layout.authLeft).toBeCloseTo(expected.authLeft, 0);
    expect(layout.authWidth).toBeCloseTo(expected.authWidth, 0);
    expect(layout.authHeight).toBeCloseTo(expected.authHeight, 0);
    expect(layout.headerHeight).toBeCloseTo(expected.headerHeight, 0);
    expect(layout.formTop).toBeCloseTo(expected.formTop, 0);
    expect(layout.formLeft).toBeCloseTo(expected.formLeft, 0);
    expect(layout.formWidth).toBeCloseTo(expected.formWidth, 0);
    expect(layout.formHeight).toBeCloseTo(expected.formHeight, 0);
    expect(layout.authButtonLeft).toBeCloseTo(expected.authButtonLeft, 2);
    expect(layout.authButtonTop).toBeCloseTo(expected.authButtonTop, 2);
    expect(layout.authButtonWidth).toBeCloseTo(expected.authButtonWidth, 2);
    expect(layout.authButtonHeight).toBeCloseTo(expected.authButtonHeight, 2);
    expect(layout.themeLeft).toBeCloseTo(expected.themeLeft, 0);
    expect(layout.themeTop).toBeCloseTo(expected.themeTop, 0);
    expect(layout.themeRight).toBeCloseTo(expected.themeRight, 0);
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
      const routeText = element.querySelector(".result-route strong");
      if (!routeText) throw new Error("Result route is missing");
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
          lineCount: (() => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return range.getClientRects().length;
          })(),
          textAlign: getComputedStyle(node).textAlign,
          baseFontSize: Number(node.dataset.baseFontSize),
          scaled: node.dataset.scaled === "true",
          wrapped: node.classList.contains("result-unit--wrapped"),
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
        mobileViewport: matchMedia("(max-width: 768px)").matches,
        innerLeft,
        innerRight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        primaryRow: row(".result-row-primary"),
        secondaryRow: row(".result-row-secondary"),
        route: unit(".result-route"),
        routeTextWhiteSpace: getComputedStyle(routeText).whiteSpace,
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
      expect(entry.scrollWidth).toBeLessThanOrEqual(entry.clientWidth + 1);
      if (entry === layout.route && layout.mode === "mobile") {
        expect(layout.routeTextWhiteSpace).toBe("normal");
      } else if (entry.wrapped) {
        expect(entry.whiteSpace).toBe("normal");
        expect(entry.lineCount).toBeGreaterThan(1);
      } else {
        expect(entry.whiteSpace).toBe("nowrap");
        expect(entry.height).toBeLessThanOrEqual(entry.fontSize * 1.8);
      }
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
      if (layout.mobileViewport) {
        expect(layout.price.textAlign).toBe("right");
        expect(layout.price.right).toBeCloseTo(layout.innerRight, 0);
      } else {
        expect(layout.price.textAlign).not.toBe("right");
        expect(layout.price.left).toBeCloseTo(layout.innerLeft, 0);
      }
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

      const titleBox = title.getBoundingClientRect();
      const badgeBox = badge.getBoundingClientRect();

      return {
        badgeText: badge.textContent,
        badgeCenter: badgeBox.top + badgeBox.height / 2,
        routeCenter: titleBox.top + titleBox.height / 2,
        routeRight: titleBox.right,
        badgeLeft: badgeBox.left,
        badgeWhiteSpace: getComputedStyle(badge).whiteSpace,
        badgeScrollWidth: badge.scrollWidth,
        badgeClientWidth: badge.clientWidth,
      };
    }, label);

    expect(layout.badgeText).toBe(label);
    expect(Math.abs(layout.badgeCenter - layout.routeCenter)).toBeLessThanOrEqual(
      8,
    );
    expect(layout.badgeLeft).toBeGreaterThanOrEqual(layout.routeRight);
    expect(layout.badgeWhiteSpace).toBe("nowrap");
    expect(layout.badgeScrollWidth).toBeLessThanOrEqual(
      layout.badgeClientWidth + 1,
    );
  }

  async expectResultRouteWrapped(
    card: Locator = this.firstResult,
  ): Promise<void> {
    const lineCount = await card.evaluate((element) => {
      const title = element.querySelector(".result-route strong");
      if (!title) throw new Error("Result route is missing");
      const range = document.createRange();
      range.selectNodeContents(title);
      return new Set(
        Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)),
      ).size;
    });

    expect(lineCount).toBeGreaterThan(1);
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

  async expectErrorCardLayoutAtWidth(width: number): Promise<void> {
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

  async mockSearchAccessSequence(
    plan: SearchPlan,
    policies: Partial<SearchPolicy>[],
  ): Promise<{ expectRequestCount: (count: number) => Promise<void> }> {
    let requestCount = 0;
    await this.page.route("**/api/search-access", async (route) => {
      const policy = policies[Math.min(requestCount, policies.length - 1)];
      requestCount++;
      await route.fulfill({ json: getSearchAccess(plan, policy) });
    });

    return {
      expectRequestCount: async (count) => {
        await expect.poll(() => requestCount).toBe(count);
      },
    };
  }

  async holdSearchAccess(
    plan: SearchPlan,
    overrides: Partial<SearchPolicy> = {},
  ): Promise<{
    waitUntilRequested: () => Promise<void>;
    expectRequestCount: (count: number) => Promise<void>;
    release: () => void;
  }> {
    let release!: () => void;
    let requestCount = 0;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await this.page.route("**/api/search-access", async (route) => {
      requestCount++;
      await gate;
      await route.fulfill({ json: getSearchAccess(plan, overrides) });
    });

    return {
      waitUntilRequested: async () => {
        await expect.poll(() => requestCount).toBeGreaterThan(0);
      },
      expectRequestCount: async (count) => {
        await expect.poll(() => requestCount).toBe(count);
      },
      release,
    };
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
            smartFlexPreference: true,
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

  async mockProgressiveSearch(results: MockSearchResult[]): Promise<{
    expectOpen: () => Promise<void>;
    complete: () => Promise<void>;
  }> {
    await this.page.addInitScript((flights: MockSearchResult[]) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        if (input !== "/search-stream") return originalFetch(input, init);

        const originCode = JSON.parse(init?.body as string).origin ?? "BUD";
        const encoder = new TextEncoder();
        const event = (result: MockSearchResult) =>
          `data: ${JSON.stringify({
            origin: { code: originCode },
            destination: { city: result.city, code: result.code },
            departure: "2026-10-09",
            return: "2026-10-11",
            price: result.price,
            currency: "HUF",
            resultType: "base",
          })}\n\n`;

        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            window.progressiveSearchOpen = true;
            controller.enqueue(encoder.encode(event(flights[0])));
            window.releaseProgressiveSearch = () => {
              for (const flight of flights.slice(1)) {
                controller.enqueue(encoder.encode(event(flight)));
              }
              controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
              window.progressiveSearchOpen = false;
              controller.close();
            };
          },
        });

        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      };
    }, results);

    return {
      expectOpen: async (): Promise<void> => {
        await expect(this.searchButton).toBeDisabled();
        await expect(this.resultsFooter).not.toContainText("Finished");
        expect(await this.page.evaluate(() => window.progressiveSearchOpen))
          .toBe(true);
      },
      complete: async (): Promise<void> => {
        await this.page.evaluate(() => {
          if (!window.releaseProgressiveSearch) {
            throw new Error("Progressive search has not started");
          }
          window.releaseProgressiveSearch();
        });
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
    let failedRequestCount = 0;
    let releaseResponse!: () => void;

    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    this.page.on("requestfailed", (request) => {
      if (request.url().endsWith("/search-stream")) {
        failedRequestCount++;
      }
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

      expectAborted: async (): Promise<void> => {
        await expect.poll(() => failedRequestCount).toBe(1);
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
    ).toHaveCount(0);
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

  async expectSelectedDestinationLayoutAtWidth(
    width: number,
    count: number,
  ): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => this.page.evaluate(() => window.innerWidth))
      .toBe(width);
    await this.expectSelectedDestinationCount(count);
    await this.page.mouse.move(0, 0);
    await expect
      .poll(() =>
        this.selectedDestinationBadges.evaluateAll((badges) =>
          badges.map((badge) => getComputedStyle(badge).transform),
        ),
      )
      .toEqual(Array(count).fill("none"));

    const naturallyNarrow = await this.expectSelectedDestinationBadgeGeometry(
      count,
    );
    const firstBadge = this.selectedDestinationBadges.first();
    const originalStyle = await firstBadge.getAttribute("style");

    try {
      if (!naturallyNarrow) {
        await firstBadge.evaluate((badge) => {
          const range = document.createRange();
          range.selectNodeContents(badge);
          const textWidth = range.getBoundingClientRect().width;

          // Stress sizing only; leave the production text-centering rules intact.
          badge.style.paddingLeft = "0px";
          badge.style.paddingRight = "0px";
          badge.style.flex = "0 0 auto";
          badge.style.width = `${textWidth / 2}px`;
        });
      }

      await this.expectSelectedDestinationBadgeGeometry(count, true);
    } finally {
      if (!naturallyNarrow) {
        await firstBadge.evaluate((badge, style) => {
          if (style === null) {
            badge.removeAttribute("style");
          } else {
            badge.setAttribute("style", style);
          }
        }, originalStyle);
      }
    }
  }

  private async expectSelectedDestinationBadgeGeometry(
    count: number,
    requireNarrowBadge = false,
  ): Promise<boolean> {
    await this.expectSelectedDestinationCount(count);
    const badges = await this.selectedDestinationBadges.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const textBox = range.getBoundingClientRect();
        return {
          code: element.textContent?.trim(),
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          textWidth: textBox.width,
          textCenter: (textBox.left + textBox.right) / 2,
          textFragments: range.getClientRects().length,
        };
      }),
    );

    // Fractional DOMRects allow a tighter gap tolerance than pixel-rounded sizes.
    const gapTolerance = 0.05;
    const alignmentTolerance = 0.5;
    for (const [index, badge] of badges.entries()) {
      expect(badge.width, `${badge.code} badge width`).toBeGreaterThan(0);
      expect(badge.bottom - badge.top).toBeGreaterThan(0);
      expect(badge.textWidth, `${badge.code} text width`).toBeGreaterThan(0);
      expect(badge.textFragments, `${badge.code} text row count`).toBe(1);
      expect(
        Math.abs(badge.top - badges[0].top),
        `${badge.code} badge must stay on the first row`,
      ).toBeLessThanOrEqual(alignmentTolerance);
      expect(
        Math.abs(badge.bottom - badges[0].bottom),
        `${badge.code} badge bottom alignment`,
      ).toBeLessThanOrEqual(alignmentTolerance);
      expect(
        Math.abs(badge.textCenter - (badge.left + badge.right) / 2),
        `${badge.code} text must be horizontally centered`,
      ).toBeLessThanOrEqual(alignmentTolerance);
      if (index > 0) {
        expect(
          Math.abs(badge.left - badges[index - 1].right - 15),
          `Gap before ${badge.code} must be 15px`,
        ).toBeLessThanOrEqual(gapTolerance);
      }
    }

    const narrowCount = badges.filter(
      (badge) => badge.textWidth - badge.width > alignmentTolerance,
    ).length;
    if (requireNarrowBadge) {
      expect(
        narrowCount,
        "At least one badge must be measurably narrower than its rendered text",
      ).toBeGreaterThan(0);
    }
    return narrowCount > 0;
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

  async expectInterruptedSearchPersisted(): Promise<void> {
    await expect(this.resultsFooter).toContainText("Search interrupted.");
    await expect
      .poll(async () =>
        this.page.evaluate(() => {
          const saved = JSON.parse(
            sessionStorage.getItem("flightFinder.lastSearch.v1") || "null",
          );
          return saved?.status;
        }),
      )
      .toBe("interrupted");
    await expect(this.results).not.toContainText("Error occurred.");
  }

  async expectRestoredSearchVisible(): Promise<void> {
    await expect(this.resultsFooter.getByText(/^Saved search:/)).toBeVisible();
    await expect(
      this.resultsFooter.getByText("Prices may have changed."),
    ).toBeVisible();
    await expect(this.results).not.toContainText(/^Saved search:/);
  }

  async expectSavedSearchFooterLayout(
    width: number,
    expected: "single" | "two" | "narrow",
  ): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
    const savedInfo = this.resultsFooter.locator(".saved-search-info");
    await expect(savedInfo).toHaveCount(1);
    await expect(savedInfo).toBeVisible();

    const layout = await savedInfo.evaluate((element) => {
      const timestamp = element.firstChild;
      const warning = element.querySelector(".price-change-warning");
      const footer = element.parentElement;
      const saved = JSON.parse(
        sessionStorage.getItem("flightFinder.lastSearch.v1") || "null",
      );
      if (
        !timestamp ||
        timestamp.nodeType !== Node.TEXT_NODE ||
        !warning ||
        !footer ||
        !saved
      ) {
        throw new Error("Saved-search footer content is missing");
      }

      const lines = (node: Node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return Array.from(range.getClientRects(), (rect) => ({
          top: rect.top,
          left: rect.left,
          right: rect.right,
        }));
      };
      const bounds = element.getBoundingClientRect();
      return {
        timestamp: timestamp.textContent,
        expectedTimestamp: `Saved search: ${new Date(saved.parameters.startedAt).toLocaleString()}. `,
        warning: warning.textContent,
        status: footer.firstChild?.textContent,
        timestampLines: lines(timestamp),
        warningLines: lines(warning),
        left: bounds.left,
        right: bounds.right,
      };
    });

    expect(layout.status).toBe("Finished...(failed: 0)");
    expect(layout.timestamp).toBe(layout.expectedTimestamp);
    expect(layout.warning).toBe("Prices may have changed.");
    expect(layout.warningLines).toHaveLength(1);
    expect(layout.timestampLines.length).toBeGreaterThan(0);
    for (const line of [...layout.timestampLines, ...layout.warningLines]) {
      expect(line.left).toBeGreaterThanOrEqual(layout.left - 1);
      expect(line.right).toBeLessThanOrEqual(layout.right + 1);
    }

    if (expected !== "narrow") {
      expect(layout.timestampLines).toHaveLength(1);
      if (expected === "single") {
        expect(layout.warningLines[0].top).toBeCloseTo(
          layout.timestampLines[0].top,
          0,
        );
      } else {
        expect(layout.warningLines[0].top).toBeGreaterThan(
          layout.timestampLines[0].top,
        );
      }
    } else {
      expect(layout.warningLines[0].top).toBeGreaterThanOrEqual(
        layout.timestampLines[0].top,
      );
    }
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
      void window.refreshSearchAccess();
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
