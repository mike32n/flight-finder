import { Locator, Page } from "@playwright/test";

export default class VerifyPage {
  readonly verificationMessage: Locator;

  constructor(page: Page) {
    this.verificationMessage = page.locator("#message");
  }
}
