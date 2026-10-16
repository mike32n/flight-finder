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

  async click(element: Locator, times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await element.click();
    }
  }

  async reloadPage(): Promise<void> {
    await this.page.reload();
  }

  async installClock(dateTime: string): Promise<void> {
    await this.page.clock.install({
      time: new Date(dateTime),
    });
  }

  async setSystemTime(dateTime: string): Promise<void> {
    await this.page.clock.setSystemTime(new Date(dateTime));
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

  async expectEnabled(element: Locator): Promise<void> {
    await expect(element).toBeEnabled();
  }

  async expectDisabled(element: Locator): Promise<void> {
    await expect(element).toBeDisabled();
  }

  async expectText(
    element: Locator,
    text: string | RegExp | (string | RegExp)[],
  ): Promise<void> {
    await expect(element).toHaveText(text);
  }

  async expectContainsText(
    element: Locator,
    text: string | RegExp,
  ): Promise<void> {
    await expect(element).toContainText(text);
  }

  async expectValue(element: Locator, value: string | RegExp): Promise<void> {
    await expect(element).toHaveValue(value);
  }
}
