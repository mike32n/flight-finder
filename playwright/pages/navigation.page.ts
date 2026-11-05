import { expect, Locator, Page } from "@playwright/test";

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

  async expectCornerIconsAlignedAtWidth(width: number): Promise<void> {
    await this.adminLink.page().setViewportSize({ width, height: 900 });
    await expect(this.adminLink).toBeVisible();

    const adminIcon = await this.adminLink.boundingBox();

    if (!adminIcon) {
      throw new Error("Administration icon is not measurable");
    }

    await this.adminLink.click();
    await expect(this.backToFlightFinderLink).toBeVisible();

    const backIcon = await this.backToFlightFinderLink.boundingBox();

    if (!backIcon) {
      throw new Error("Back to Flight Finder icon is not measurable");
    }

    expect(backIcon.x).toBe(adminIcon.x);
    expect(backIcon.y).toBe(adminIcon.y);
    expect(backIcon.width).toBe(adminIcon.width);
    expect(backIcon.height).toBe(adminIcon.height);

    await this.backToFlightFinderLink.click();
    await expect(this.adminLink).toBeVisible();
  }
}
