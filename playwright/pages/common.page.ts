import { Locator, Page } from "@playwright/test";

export default class CommonPage {
  readonly page: Page;
  readonly body: Locator;

  constructor(page: Page) {
    this.page = page;
    this.body = page.locator("body");
  }
}
