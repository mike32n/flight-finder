import { expect, Locator, Page } from "@playwright/test";

export default class NavigationPage {
  readonly adminLink: Locator;
  readonly adminIcon: Locator;
  readonly searchView: Locator;
  readonly adminView: Locator;
  readonly selectedContainer: Locator;
  readonly policiesHeading: Locator;
  readonly themeButton: Locator;
  readonly redundantBackControl: Locator;
  private documentLoadCount = 0;

  constructor(page: Page) {
    this.adminLink = page.locator("#admin-link");
    this.adminIcon = this.adminLink.locator("span");
    this.searchView = page.locator("#search-view");
    this.adminView = page.locator("#admin-view");
    this.selectedContainer = page.locator("#selected-container");
    this.policiesHeading = page.locator("#policies-heading");
    this.themeButton = page.locator("#theme-button");
    this.redundantBackControl = page.locator("#admin-back-link");

    page.on("load", () => {
      this.documentLoadCount++;
    });
  }

  async expectAdminViewActive(): Promise<void> {
    await expect(this.adminView).toBeVisible();
    await expect(this.searchView).toBeHidden();
    await expect(this.adminLink).toBeVisible();
    await expect(this.adminLink).toHaveAttribute("aria-label", "Back to Flight Finder");
    await expect(this.adminLink).toHaveAttribute("href", "#search");
    await expect(this.adminIcon).toHaveText("←");
    await expect(this.policiesHeading).toHaveText("Plan policies");
    await expect(this.themeButton).toBeVisible();
    await expect(this.redundantBackControl).toHaveCount(0);
  }

  async expectSearchViewActive(): Promise<void> {
    await expect(this.searchView).toBeVisible();
    await expect(this.adminView).toBeHidden();
    await expect(this.adminLink).toHaveAttribute("aria-label", "Administration");
    await expect(this.adminLink).toHaveAttribute("href", "#admin");
    await expect(this.adminIcon).toHaveText("⚙");
  }

  async openAdminView(): Promise<void> {
    const loadCount = this.documentLoadCount;
    await this.adminLink.click();
    await this.expectAdminViewActive();
    await expect(this.adminLink.page()).toHaveURL(/#admin$/);
    expect(this.documentLoadCount).toBe(loadCount);
  }

  async returnToSearchView(): Promise<void> {
    const loadCount = this.documentLoadCount;
    await this.adminLink.click();
    await this.expectSearchViewActive();
    await expect(this.adminLink.page()).toHaveURL(/#search$/);
    expect(this.documentLoadCount).toBe(loadCount);
  }

  async goBackToSearchView(): Promise<void> {
    const loadCount = this.documentLoadCount;
    await this.adminLink.page().goBack();
    await this.expectSearchViewActive();
    expect(this.documentLoadCount).toBe(loadCount);
  }

  async goForwardToAdminView(): Promise<void> {
    const loadCount = this.documentLoadCount;
    await this.adminLink.page().goForward();
    await this.expectAdminViewActive();
    expect(this.documentLoadCount).toBe(loadCount);
  }

  async expectSharedCornerIconAtWidth(width: number): Promise<void> {
    await this.adminLink.page().setViewportSize({ width, height: 640 });
    await this.expectSearchViewActive();
    const searchBox = await this.adminLink.boundingBox();
    const badgesBox = await this.selectedContainer.boundingBox();

    if (!searchBox || !badgesBox) {
      throw new Error("Search view layout is not measurable");
    }

    const searchLayout = await this.adminLink.page().evaluate(() => {
      const shell = document.getElementById("app-shell");
      if (!shell) throw new Error("Application shell is missing");

      const bounds = shell.getBoundingClientRect();
      const root = document.documentElement;

      return {
        documentWidth: root.scrollWidth,
        viewportWidth: window.innerWidth,
        shellCenter: bounds.left + bounds.width / 2,
        bodyCenter:
          document.body.getBoundingClientRect().left +
          document.body.getBoundingClientRect().width / 2,
        scrollbarGutter: getComputedStyle(root).scrollbarGutter,
        overflowY: getComputedStyle(root).overflowY,
      };
    });

    expect(searchLayout.scrollbarGutter).toBe("stable");
    expect(searchLayout.documentWidth).toBeLessThanOrEqual(
      searchLayout.viewportWidth,
    );
    expect(searchLayout.shellCenter).toBeCloseTo(searchLayout.bodyCenter, 0);
    expect(searchLayout.overflowY).not.toBe("hidden");

    await this.openAdminView();
    const adminBox = await this.adminLink.boundingBox();
    const policiesBox = await this.policiesHeading.boundingBox();

    if (!adminBox || !policiesBox) {
      throw new Error("Administration view layout is not measurable");
    }

    expect(adminBox.x).toBe(searchBox.x);
    expect(adminBox.y).toBe(searchBox.y);
    expect(adminBox.width).toBe(searchBox.width);
    expect(adminBox.height).toBe(searchBox.height);
    expect(policiesBox.y).toBe(badgesBox.y);
    expect(policiesBox.height).toBe(badgesBox.height);
    expect(policiesBox.x + policiesBox.width / 2).toBe(
      badgesBox.x + badgesBox.width / 2,
    );

    const adminLayout = await this.adminLink.page().evaluate(() => {
      const shell = document.getElementById("app-shell");
      if (!shell) throw new Error("Application shell is missing");

      const bounds = shell.getBoundingClientRect();
      const root = document.documentElement;

      return {
        documentWidth: root.scrollWidth,
        viewportWidth: window.innerWidth,
        shellCenter: bounds.left + bounds.width / 2,
        bodyCenter:
          document.body.getBoundingClientRect().left +
          document.body.getBoundingClientRect().width / 2,
        scrollbarGutter: getComputedStyle(root).scrollbarGutter,
        overflowY: getComputedStyle(root).overflowY,
        scrollHeight: root.scrollHeight,
        clientHeight: root.clientHeight,
      };
    });

    expect(adminLayout.scrollbarGutter).toBe("stable");
    expect(adminLayout.documentWidth).toBeLessThanOrEqual(
      adminLayout.viewportWidth,
    );
    expect(adminLayout.shellCenter).toBeCloseTo(adminLayout.bodyCenter, 0);
    expect(adminLayout.overflowY).not.toBe("hidden");
    expect(adminLayout.scrollHeight).toBeGreaterThan(adminLayout.clientHeight);

    const canScrollVertically = await this.adminLink.page().evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return window.scrollY > 0;
    });
    expect(canScrollVertically).toBe(true);
    await this.adminLink.page().evaluate(() => window.scrollTo(0, 0));

    await this.returnToSearchView();
  }

  async mockAdminRevokedForCurrentUser(): Promise<void> {
    await this.adminLink.page().route("**/api/auth/me", async (route) => {
      const response = await route.fetch();
      const body = await response.json();

      body.user.isAdmin = false;

      await route.fulfill({ response, json: body });
    });
  }
}
