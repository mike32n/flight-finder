import { Locator, Page } from "@playwright/test";

export default class NavigationPage {
  readonly adminLink: Locator;
  readonly backToFlightFinderLink: Locator;

  constructor(page: Page) {
    this.adminLink = page.locator("#admin-link");

    this.backToFlightFinderLink = page.getByRole("link", {
      name: "Back to Flight Finder",
      exact: true,
    });
  }
}
