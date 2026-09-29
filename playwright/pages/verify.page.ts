import { Locator, Page, expect } from "@playwright/test";

export default class VerifyPage {
  readonly page: Page;
  readonly verificationMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.verificationMessage = page.locator("#message");
  }

  async expectVerificationMessage(message: string): Promise<void> {
    await expect(this.verificationMessage).toContainText(message);
  }
}
