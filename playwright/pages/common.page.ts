import { Locator, Page, expect } from "@playwright/test";

export default class CommonPage {
  readonly page: Page;
  readonly body: Locator;

  constructor(page: Page) {
    this.page = page;
    this.body = page.locator("body");
  }

  async openPage(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async expectDarkThemeIsActive(): Promise<void> {
    await expect(this.body).toHaveClass(/dark/);
  }

  async expectLightThemeIsActive(): Promise<void> {
    await expect(this.body).not.toHaveClass(/dark/);
  }

  async expectVisible(element: Locator): Promise<void> {
    await expect(element).toBeVisible();
  }

  async expectHidden(element: Locator): Promise<void> {
    await expect(element).not.toBeVisible();
  }

  async expectNotPresent(element: Locator): Promise<void> {
    await expect(element).toHaveCount(0);
  }
}
