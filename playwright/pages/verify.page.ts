import { Locator, Page } from "@playwright/test";

export default class VerifyPage {
  readonly page: Page;
  readonly verificationMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.verificationMessage = page.locator("#message");
  }
}
