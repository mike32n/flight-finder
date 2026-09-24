import { Locator, Page, expect } from "@playwright/test";

export default class ResetPage {
  readonly page: Page;

  readonly newPasswordInput: Locator;
  readonly resetButton: Locator;
  readonly resetMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.newPasswordInput = page.locator("#password");
    this.resetButton = page.locator("#reset-btn");
    this.resetMessage = page.locator("#message");
  }

  async expectResetFormEnabled(): Promise<void> {
    await expect(this.newPasswordInput).toBeEnabled();
    await expect(this.resetButton).toBeEnabled();
  }

  async expectTokenError(): Promise<void> {
    await expect(this.resetMessage).toContainText(
      "Invalid or expired password reset token.",
    );
  }
}
