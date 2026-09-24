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

  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  async submitPasswordReset(): Promise<void> {
    await this.resetButton.click();
  }

  async expectResetFormEnabled(): Promise<void> {
    await expect(this.newPasswordInput).toBeEnabled();
    await expect(this.resetButton).toBeEnabled();
  }

  async expectPasswordResetMessage(message: string): Promise<void> {
    await expect(this.resetMessage).toContainText(message);
  }

  async expectResetFormDisabled(): Promise<void> {
    await expect(this.newPasswordInput).toBeDisabled();
    await expect(this.resetButton).toBeDisabled();
  }
}
