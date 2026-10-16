import { Locator, Page, expect } from "@playwright/test";

export default class ResetPasswordPage {
  readonly newPasswordInput: Locator;
  readonly resetButton: Locator;
  readonly resetMessage: Locator;

  constructor(page: Page) {
    this.newPasswordInput = page.locator("#password");
    this.resetButton = page.locator("#reset-btn");
    this.resetMessage = page.locator("#message");
  }

  async expectResetFormEnabled(): Promise<void> {
    await expect(this.newPasswordInput).toBeEnabled();
    await expect(this.resetButton).toBeEnabled();
  }

  async expectResetFormDisabled(): Promise<void> {
    await expect(this.newPasswordInput).toBeDisabled();
    await expect(this.resetButton).toBeDisabled();
  }
}
