import { expect, Locator, Page } from "@playwright/test";

export default class NavigationPage {
  readonly adminLink: Locator;
  readonly adminIcon: Locator;
  readonly searchView: Locator;
  readonly adminView: Locator;
  readonly searchBadgeRow: Locator;
  readonly appShell: Locator;
  readonly results: Locator;
  readonly resultsScrollShell: Locator;
  readonly resultsScrollbar: Locator;
  readonly resultsScrollbarThumb: Locator;
  readonly resultsFooter: Locator;
  readonly policiesHeading: Locator;
  readonly themeButton: Locator;
  readonly redundantBackControl: Locator;
  private documentLoadCount = 0;

  constructor(page: Page) {
    this.adminLink = page.locator("#admin-link");
    this.adminIcon = this.adminLink.locator("span");
    this.searchView = page.locator("#search-view");
    this.adminView = page.locator("#admin-view");
    this.searchBadgeRow = page.locator("#selected-container");
    this.appShell = page.locator("#app-shell");
    this.results = page.locator("#results");
    this.resultsScrollShell = page.locator("#results-scroll-shell");
    this.resultsScrollbar = page.locator("#results-scrollbar");
    this.resultsScrollbarThumb = page.locator("#results-scrollbar-thumb");
    this.resultsFooter = page.locator("#results-footer");
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
    await expect(this.adminLink).toHaveAttribute(
      "aria-label",
      "Back to Flight Finder",
    );
    await expect(this.adminLink).toHaveAttribute("href", "#search");
    await expect(this.adminIcon).toHaveText("←");
    await expect(this.policiesHeading).toHaveText("Plan policies");
    await expect(this.themeButton).toBeVisible();
    await expect(this.redundantBackControl).toHaveCount(0);
  }

  async expectSearchViewActive(): Promise<void> {
    await expect(this.searchView).toBeVisible();
    await expect(this.adminView).toBeHidden();
    await expect(this.adminLink).toHaveAttribute(
      "aria-label",
      "Administration",
    );
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

  async beginReturnToSearchView(): Promise<void> {
    await this.adminLink.click();
    await expect(this.adminLink.page()).toHaveURL(/#search$/);
  }

  async goBackWhileSearchRefreshPending(): Promise<void> {
    await this.adminLink.page().goBack();
    await expect(this.adminLink.page()).toHaveURL(/#admin$/);
    await this.expectAdminViewActive();
  }

  async holdNextAdminRevalidation(): Promise<{
    waitUntilRequested: () => Promise<void>;
    release: () => void;
  }> {
    let release!: () => void;
    let requested = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await this.adminLink.page().route("**/api/auth/me", async (route) => {
      if (requested || route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      requested = true;
      await gate;
      await route.continue();
    });

    return {
      waitUntilRequested: async () => {
        await expect.poll(() => requested).toBe(true);
      },
      release,
    };
  }

  async beginBackToAdmin(): Promise<void> {
    await this.adminLink.page().goBack();
    await expect(this.adminLink.page()).toHaveURL(/#admin$/);
  }

  async goForwardWhileSearchRefreshPending(): Promise<void> {
    await this.adminLink.page().goForward();
    await expect(this.adminLink.page()).toHaveURL(/#search$/);
    await expect(this.searchView).toBeVisible();
    await expect(this.adminView).toBeHidden();
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
    const searchBadgeRowBox = await this.searchBadgeRow.boundingBox();

    if (!searchBox || !searchBadgeRowBox) {
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
    expect(policiesBox.height).toBe(searchBadgeRowBox.height);
    expect(policiesBox.y + policiesBox.height / 2).toBe(
      searchBadgeRowBox.y + searchBadgeRowBox.height / 2,
    );
    expect(policiesBox.x + policiesBox.width / 2).toBe(
      searchBadgeRowBox.x + searchBadgeRowBox.width / 2,
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
      };
    });

    expect(adminLayout.scrollbarGutter).toBe("stable");
    expect(adminLayout.documentWidth).toBeLessThanOrEqual(
      adminLayout.viewportWidth,
    );
    expect(adminLayout.shellCenter).toBeCloseTo(adminLayout.bodyCenter, 0);
    expect(adminLayout.overflowY).not.toBe("hidden");
    await this.adminLink.page().evaluate(() => window.scrollTo(0, 0));

    await this.returnToSearchView();
  }

  async expectResponsiveScrollingAtWidth(
    width: number,
    adminContent: Locator,
  ): Promise<void> {
    const page = this.adminLink.page();
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width > 768) {
      await expect
        .poll(() =>
          page.locator("#app-shell").evaluate((shell) => {
            const shellStyle = getComputedStyle(shell);
            const shellBottom =
              shell.getBoundingClientRect().bottom +
              Number.parseFloat(shellStyle.marginBottom);

            return shellBottom <= document.documentElement.clientHeight + 1;
          }),
        )
        .toBe(true);
    }
    await expect
      .poll(() =>
        this.results.locator(".result-card").evaluateAll(
          (cards) =>
            cards.length > 0 &&
            cards.every((card) => {
              const style = getComputedStyle(card);
              const contentWidth =
                card.clientWidth -
                parseFloat(style.paddingLeft) -
                parseFloat(style.paddingRight);

              return (
                Math.abs(Number(card.dataset.layoutWidth) - contentWidth) < 0.5
              );
            }),
        ),
      )
      .toBe(true);

    const searchLayout = await page.evaluate(() => {
      const root = document.documentElement;
      const header = document.getElementById("app-header");
      const searchButton = document.getElementById("search-button");
      const results = document.getElementById("results");
      const scrollbar = document.getElementById("results-scrollbar");

      if (!header || !searchButton || !results || !scrollbar) {
        throw new Error("Search scrolling elements are missing");
      }

      const headerTop = header.getBoundingClientRect().top;
      const searchButtonTop = searchButton.getBoundingClientRect().top;
      const searchButtonHeight = searchButton.getBoundingClientRect().height;

      results.scrollTop = results.scrollHeight;

      return {
        documentWidth: root.scrollWidth,
        viewportWidth: root.clientWidth,
        documentHeight: root.scrollHeight,
        viewportHeight: root.clientHeight,
        documentScrollTop: window.scrollY,
        resultsHeight: results.clientHeight,
        resultsContentHeight: results.scrollHeight,
        resultsScrollTop: results.scrollTop,
        resultsOverflowY: getComputedStyle(results).overflowY,
        scrollbarDisplay: getComputedStyle(scrollbar).display,
        headerTop,
        headerTopAfterScroll: header.getBoundingClientRect().top,
        searchButtonTop,
        searchButtonTopAfterScroll: searchButton.getBoundingClientRect().top,
        searchButtonHeight,
        searchButtonHeightAfterScroll:
          searchButton.getBoundingClientRect().height,
      };
    });
    expect(searchLayout.documentWidth).toBeLessThanOrEqual(
      searchLayout.viewportWidth,
    );

    if (width > 768) {
      expect(searchLayout.resultsOverflowY).toBe("auto");
      expect(searchLayout.scrollbarDisplay).not.toBe("none");
      expect(searchLayout.documentHeight).toBeLessThanOrEqual(
        searchLayout.viewportHeight + 1,
      );
      expect(searchLayout.resultsContentHeight).toBeGreaterThan(
        searchLayout.resultsHeight,
      );
      expect(searchLayout.resultsScrollTop).toBeGreaterThan(0);
      expect(searchLayout.documentScrollTop).toBe(0);
      expect(searchLayout.headerTopAfterScroll).toBe(searchLayout.headerTop);
      expect(searchLayout.searchButtonTopAfterScroll).toBe(
        searchLayout.searchButtonTop,
      );
      expect(searchLayout.searchButtonHeightAfterScroll).toBe(
        searchLayout.searchButtonHeight,
      );
    } else {
      const mobileSearchLayout = await page.evaluate(() => {
        const results = document.getElementById("results");
        const scrollbar = document.getElementById("results-scrollbar");
        if (!results || !scrollbar) {
          throw new Error("Search results elements are missing");
        }

        window.scrollTo(0, document.documentElement.scrollHeight);

        return {
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: document.documentElement.clientHeight,
          documentScrollTop: window.scrollY,
          resultsHeight: results.clientHeight,
          resultsContentHeight: results.scrollHeight,
          resultsOverflowY: getComputedStyle(results).overflowY,
          scrollbarDisplay: getComputedStyle(scrollbar).display,
        };
      });

      expect(mobileSearchLayout.resultsOverflowY).toBe("visible");
      expect(mobileSearchLayout.scrollbarDisplay).toBe("none");
      expect(mobileSearchLayout.documentHeight).toBeGreaterThan(
        mobileSearchLayout.viewportHeight,
      );
      expect(mobileSearchLayout.documentScrollTop).toBeGreaterThan(0);
      expect(mobileSearchLayout.resultsContentHeight).toBeLessThanOrEqual(
        mobileSearchLayout.resultsHeight + 1,
      );
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await this.openAdminView();
    await expect(adminContent).toBeVisible();

    const adminLayout = await adminContent.evaluate((content) => {
      const root = document.documentElement;
      const header = document.getElementById("app-header");
      const heading = document.getElementById("policies-heading");
      const table = document.getElementById("plan-policies-table");

      if (!header || !heading || !table) {
        throw new Error("Administration scrolling elements are missing");
      }

      const headerTop = header.getBoundingClientRect().top;
      const headingTop = heading.getBoundingClientRect().top;

      content.scrollTop = content.scrollHeight;

      return {
        documentWidth: root.scrollWidth,
        viewportWidth: root.clientWidth,
        documentHeight: root.scrollHeight,
        viewportHeight: root.clientHeight,
        documentScrollTop: window.scrollY,
        contentHeight: content.clientHeight,
        contentScrollHeight: content.scrollHeight,
        contentScrollTop: content.scrollTop,
        contentBottom: content.getBoundingClientRect().bottom,
        tableBottom: table.getBoundingClientRect().bottom,
        headerTop,
        headerTopAfterScroll: header.getBoundingClientRect().top,
        headingTop,
        headingTopAfterScroll: heading.getBoundingClientRect().top,
      };
    });

    expect(adminLayout.documentWidth).toBeLessThanOrEqual(
      adminLayout.viewportWidth,
    );

    if (width > 768) {
      expect(adminLayout.documentHeight).toBeLessThanOrEqual(
        adminLayout.viewportHeight + 1,
      );
      expect(adminLayout.contentScrollHeight).toBeGreaterThan(
        adminLayout.contentHeight,
      );
      expect(adminLayout.contentScrollTop).toBeGreaterThan(0);
      expect(adminLayout.documentScrollTop).toBe(0);
      expect(adminLayout.tableBottom).toBeLessThanOrEqual(
        adminLayout.contentBottom + 1,
      );
      expect(adminLayout.headerTopAfterScroll).toBe(adminLayout.headerTop);
      expect(adminLayout.headingTopAfterScroll).toBe(adminLayout.headingTop);
    } else {
      const mobileAdminLayout = await adminContent.evaluate((content) => {
        window.scrollTo(0, document.documentElement.scrollHeight);

        return {
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: document.documentElement.clientHeight,
          documentScrollTop: window.scrollY,
          contentHeight: content.clientHeight,
          contentScrollHeight: content.scrollHeight,
        };
      });

      expect(mobileAdminLayout.documentHeight).toBeGreaterThan(
        mobileAdminLayout.viewportHeight,
      );
      expect(mobileAdminLayout.documentScrollTop).toBeGreaterThan(0);
      expect(mobileAdminLayout.contentScrollHeight).toBeLessThanOrEqual(
        mobileAdminLayout.contentHeight + 1,
      );
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await this.returnToSearchView();
    await expect(this.results).toBeVisible();

    const restoredSearchLayout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      resultsHeight: document.getElementById("results")?.clientHeight ?? 0,
      resultsContentHeight:
        document.getElementById("results")?.scrollHeight ?? 0,
    }));

    expect(restoredSearchLayout.documentWidth).toBeLessThanOrEqual(
      restoredSearchLayout.viewportWidth,
    );

    if (width > 768) {
      expect(restoredSearchLayout.documentHeight).toBeLessThanOrEqual(
        restoredSearchLayout.viewportHeight + 1,
      );
      expect(restoredSearchLayout.resultsContentHeight).toBeGreaterThan(
        restoredSearchLayout.resultsHeight,
      );
    } else {
      expect(restoredSearchLayout.documentHeight).toBeGreaterThan(
        restoredSearchLayout.viewportHeight,
      );
      expect(restoredSearchLayout.resultsContentHeight).toBeLessThanOrEqual(
        restoredSearchLayout.resultsHeight + 1,
      );
    }
  }

  async expectResultsScrollbarStableAtWidth(width: number): Promise<void> {
    const page = this.results.page();
    await page.setViewportSize({ width, height: 1400 });

    const measure = async () =>
      this.results.evaluate((results) => {
        const shell = document.getElementById("results-scroll-shell");
        const track = document.getElementById("results-scrollbar");
        const thumb = document.getElementById("results-scrollbar-thumb");
        const card = results.querySelector(".result-card");
        const searchButton = document.getElementById("search-button");

        if (!shell || !track || !thumb || !card || !searchButton) {
          throw new Error("Results scrollbar measurement elements are missing");
        }

        const cardRect = card.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const resultsRect = results.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const buttonRect = searchButton.getBoundingClientRect();
        const indicatorStyle = getComputedStyle(track, "::after");
        const indicatorRect = {
          left: trackRect.right - Number.parseFloat(indicatorStyle.width),
          right: trackRect.right,
          width: Number.parseFloat(indicatorStyle.width),
        };
        const footer = document.getElementById("results-footer");
        if (!footer) throw new Error("Results footer is missing");
        const footerRect = footer.getBoundingClientRect();
        const footerStyle = getComputedStyle(footer);
        const contentHeight = Math.max(
          results.scrollHeight,
          ...Array.from(results.children, (child) => {
            const childRect = child.getBoundingClientRect();
            return childRect.bottom - resultsRect.top + results.scrollTop;
          }),
        );
        const appShell = document.getElementById("app-shell");
        if (!appShell) throw new Error("Application shell is missing");
        const appShellRect = appShell.getBoundingClientRect();
        const appShellStyle = getComputedStyle(appShell);

        return {
          overflowing: results.scrollHeight > results.clientHeight,
          cardLeft: cardRect.left,
          cardRight: cardRect.right,
          cardWidth: cardRect.width,
          resultsRight: resultsRect.right,
          trackLeft: trackRect.left,
          trackRight: trackRect.right,
          trackWidth: trackRect.width,
          trackHeight: trackRect.height,
          actualContentHeight: contentHeight,
          trackTop: trackRect.top,
          trackBottom: trackRect.bottom,
          shellRight: shellRect.right,
          appShellHeight: appShell.getBoundingClientRect().height,
          naturalAppShellHeight:
            resultsRect.top -
            appShellRect.top +
            Math.max(contentHeight, 120) +
            footerRect.height +
            Number.parseFloat(footerStyle.marginTop) +
            Number.parseFloat(footerStyle.marginBottom) +
            Number.parseFloat(appShellStyle.paddingBottom) +
            Number.parseFloat(appShellStyle.borderBottomWidth),
          viewportHeight: document.documentElement.clientHeight,
          trackDisplay: getComputedStyle(track).display,
          trackVisibility: getComputedStyle(track).visibility,
          trackOpacity: getComputedStyle(track).opacity,
          trackBackground: getComputedStyle(track).backgroundColor,
          trackBorder: getComputedStyle(track).border,
          trackOutline: getComputedStyle(track).outline,
          trackBoxShadow: getComputedStyle(track).boxShadow,
          indicatorVisibility: indicatorStyle.visibility,
          indicatorWidth: indicatorRect.width,
          indicatorLeft: indicatorRect.left,
          indicatorRight: indicatorRect.right,
          indicatorBoxShadow: indicatorStyle.boxShadow,
          indicatorBorderLeftWidth: indicatorStyle.borderLeftWidth,
          indicatorBorderRightWidth: indicatorStyle.borderRightWidth,
          indicatorBorderTopWidth: indicatorStyle.borderTopWidth,
          indicatorBorderBottomWidth: indicatorStyle.borderBottomWidth,
          trackActive: track.dataset.active,
          trackHasResults: track.dataset.hasResults,
          thumbHeight: thumb.getBoundingClientRect().height,
          thumbBottom: thumb.getBoundingClientRect().bottom,
          thumbBackground: getComputedStyle(thumb).backgroundColor,
          thumbTop: thumb.getBoundingClientRect().top,
          thumbVisibility: getComputedStyle(thumb).visibility,
          resultsScrollTop: results.scrollTop,
          resultsClientHeight: results.clientHeight,
          footerHeight: footerRect.height,
          footerTop: footerRect.top,
          footerBottom: footerRect.bottom,
          footerInResults: results.contains(footer),
          footerMarginTop: Number.parseFloat(footerStyle.marginTop),
          footerMarginBottom: Number.parseFloat(footerStyle.marginBottom),
          buttonRight: buttonRect.right,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          resultsScrollHeight: results.scrollHeight,
          resultsScrollWidth: results.scrollWidth,
          resultsClientWidth: results.clientWidth,
          nativeScrollbarWidth: getComputedStyle(results).scrollbarWidth,
          webkitScrollbarDisplay: getComputedStyle(
            results,
            "::-webkit-scrollbar",
          ).display,
        };
      });

    const waitForLayout = async () => {
      await this.results.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    };

    const emptyLayout = await this.results.evaluate(async (results) => {
      const track = document.getElementById("results-scrollbar");
      const thumb = document.getElementById("results-scrollbar-thumb");
      const indicator = track ? getComputedStyle(track, "::after") : null;
      if (!track || !thumb || !indicator) {
        throw new Error("Results scrollbar is missing");
      }

      const originalChildren = [...results.childNodes];
      results.replaceChildren();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const empty = {
        trackVisibility: getComputedStyle(track).visibility,
        trackHasResults: track.dataset.hasResults,
        trackActive: track.dataset.active,
        trackHeight: track.getBoundingClientRect().height,
        indicatorVisibility: indicator.visibility,
        thumbVisibility: getComputedStyle(thumb).visibility,
      };
      results.replaceChildren(...originalChildren);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      return empty;
    });

    await waitForLayout();
    const withoutOverflow = await measure();

    await page.setViewportSize({ width, height: 500 });
    await waitForLayout();
    await expect(this.resultsScrollbar).toHaveAttribute("data-active", "true");
    await waitForLayout();
    await this.results.evaluate((results) => {
      results.scrollTop = results.scrollHeight;
    });
    await waitForLayout();
    const thumbAtBottom = await this.resultsScrollbarThumb.evaluate(
      (thumb) => thumb.getBoundingClientRect().top,
    );
    const withOverflow = await measure();
    const resultsAtBottom = await this.results.evaluate(
      (results) => results.scrollTop,
    );
    expect(resultsAtBottom).toBeGreaterThan(0);
    expect(thumbAtBottom).toBeGreaterThan(withOverflow.trackTop);

    await page.setViewportSize({ width, height: 900 });
    await expect(this.resultsScrollbar).toHaveAttribute("data-active", "true");
    await waitForLayout();
    const tallerViewport = await measure();
    expect(tallerViewport.thumbHeight).toBeGreaterThan(
      withOverflow.thumbHeight,
    );

    await page.setViewportSize({ width, height: 500 });
    await expect(this.resultsScrollbar).toHaveAttribute("data-active", "true");

    await this.results.evaluate((results) => {
      results.scrollTop = 0;
    });
    await this.results.focus();
    await page.keyboard.press("PageDown");
    await expect
      .poll(() => this.results.evaluate((results) => results.scrollTop))
      .toBeGreaterThan(0);

    await this.results.evaluate((results) => {
      results.scrollTop = 0;
    });
    await this.resultsScrollbar.hover();
    await page.mouse.wheel(0, 100);
    await expect
      .poll(() => this.results.evaluate((results) => results.scrollTop))
      .toBeGreaterThan(0);

    await this.results.evaluate((results) => {
      results.scrollTop = 0;
    });
    await this.resultsScrollbar.click({
      position: { x: 6, y: Math.max(12, withOverflow.trackHeight - 5) },
    });
    await expect
      .poll(() => this.results.evaluate((results) => results.scrollTop))
      .toBeGreaterThan(0);

    const thumbBox = await this.resultsScrollbarThumb.boundingBox();
    if (!thumbBox) throw new Error("Active scrollbar thumb is not visible");
    const scrollBeforeDrag = await this.results.evaluate(
      (results) => results.scrollTop,
    );
    const thumbCenterX = thumbBox.x + thumbBox.width / 2;
    const thumbCenterY = thumbBox.y + thumbBox.height / 2;
    await page.mouse.move(thumbCenterX, thumbCenterY);
    await page.mouse.down();
    await page.mouse.move(thumbCenterX, thumbCenterY - 15);
    await page.mouse.up();
    await expect
      .poll(() => this.results.evaluate((results) => results.scrollTop))
      .toBeLessThan(scrollBeforeDrag);

    await page.setViewportSize({ width, height: 1400 });
    await waitForLayout();
    await expect(this.resultsScrollbar).toHaveAttribute("data-active", "false");
    await waitForLayout();
    const afterOverflow = await measure();

    expect(withoutOverflow.overflowing).toBe(false);
    expect(withOverflow.overflowing).toBe(true);
    expect(afterOverflow.overflowing).toBe(false);
    expect(afterOverflow.trackHasResults).toBe("true");
    expect(afterOverflow.trackActive).toBe("false");
    expect(afterOverflow.thumbVisibility).toBe("hidden");
    expect(afterOverflow.thumbHeight).toBe(0);
    expect(emptyLayout.trackVisibility).toBe("hidden");
    expect(emptyLayout.trackHasResults).toBe("false");
    expect(emptyLayout.trackActive).toBe("false");
    expect(emptyLayout.trackHeight).toBe(0);
    expect(emptyLayout.indicatorVisibility).toBe("hidden");
    expect(emptyLayout.thumbVisibility).toBe("hidden");
    expect(withoutOverflow.trackDisplay).not.toBe("none");
    expect(withoutOverflow.trackVisibility).toBe("visible");
    expect(withoutOverflow.trackOpacity).toBe("1");
    expect(withoutOverflow.indicatorVisibility).toBe("visible");
    expect(withoutOverflow.indicatorWidth).toBe(6);
    expect(withoutOverflow.indicatorLeft).toBeCloseTo(
      withoutOverflow.trackLeft + 6,
      0,
    );
    expect(withoutOverflow.indicatorRight).toBeCloseTo(
      withoutOverflow.trackRight,
      0,
    );
    expect(withoutOverflow.indicatorBoxShadow).toBe("none");
    expect(withoutOverflow.indicatorBorderLeftWidth).toBe("0px");
    expect(withoutOverflow.indicatorBorderRightWidth).toBe("1px");
    expect(withoutOverflow.indicatorBorderTopWidth).toBe("1px");
    expect(withoutOverflow.indicatorBorderBottomWidth).toBe("1px");
    expect(withoutOverflow.trackWidth).toBe(12);
    expect(withoutOverflow.trackHeight).toBeGreaterThan(0);
    expect(withoutOverflow.trackHeight).toBeCloseTo(
      withoutOverflow.actualContentHeight,
      0,
    );
    expect(withoutOverflow.trackHeight).toBeLessThanOrEqual(
      withoutOverflow.actualContentHeight + 1,
    );
    expect(withoutOverflow.trackActive).toBe("false");
    expect(withoutOverflow.trackHasResults).toBe("true");
    expect(withoutOverflow.trackBackground).toBe("rgba(0, 0, 0, 0)");
    expect(withoutOverflow.thumbVisibility).toBe("hidden");
    expect(withoutOverflow.thumbHeight).toBe(0);
    expect(withOverflow.trackDisplay).not.toBe("none");
    expect(withOverflow.trackVisibility).toBe("visible");
    expect(withOverflow.indicatorVisibility).toBe("visible");
    expect(withOverflow.indicatorWidth).toBe(6);
    expect(withOverflow.indicatorLeft).toBeCloseTo(
      withOverflow.trackLeft + 6,
      0,
    );
    expect(withOverflow.indicatorRight).toBeCloseTo(withOverflow.trackRight, 0);
    expect(withOverflow.indicatorBoxShadow).toBe("none");
    expect(withOverflow.indicatorBorderLeftWidth).toBe("0px");
    expect(withOverflow.indicatorBorderRightWidth).toBe("1px");
    expect(withOverflow.indicatorBorderTopWidth).toBe("1px");
    expect(withOverflow.indicatorBorderBottomWidth).toBe("1px");
    expect(withOverflow.trackHeight).toBeCloseTo(
      withOverflow.resultsClientHeight,
      0,
    );
    expect(withOverflow.trackHeight).toBeLessThanOrEqual(
      withOverflow.actualContentHeight + 1,
    );
    expect(withOverflow.trackActive).toBe("true");
    expect(withOverflow.trackHasResults).toBe("true");
    expect(withOverflow.thumbVisibility).toBe("visible");
    expect(withOverflow.thumbBackground).toBe("rgb(0, 0, 0)");
    expect(withOverflow.thumbHeight).toBeCloseTo(
      (withOverflow.trackHeight * withOverflow.resultsClientHeight) /
        withOverflow.resultsScrollHeight,
      0,
    );
    expect(withOverflow.thumbTop).toBeCloseTo(
      withOverflow.trackTop +
        (withOverflow.resultsScrollTop /
          (withOverflow.resultsScrollHeight -
            withOverflow.resultsClientHeight)) *
          (withOverflow.trackHeight - withOverflow.thumbHeight),
      0,
    );
    expect(withOverflow.thumbTop).toBeGreaterThanOrEqual(withOverflow.trackTop);
    expect(withOverflow.thumbBottom).toBeLessThanOrEqual(
      withOverflow.trackBottom + 0.1,
    );
    expect(tallerViewport.thumbHeight).toBeLessThanOrEqual(
      tallerViewport.trackHeight,
    );
    expect(tallerViewport.trackHeight).toBeLessThanOrEqual(
      tallerViewport.actualContentHeight + 1,
    );
    expect(withoutOverflow.nativeScrollbarWidth).toBe("none");
    expect(withOverflow.nativeScrollbarWidth).toBe("none");
    expect(["", "none"]).toContain(withoutOverflow.webkitScrollbarDisplay);
    expect(["", "none"]).toContain(withOverflow.webkitScrollbarDisplay);

    for (const state of [withoutOverflow, withOverflow, afterOverflow]) {
      expect(state.cardRight).toBeCloseTo(state.resultsRight, 0);
      expect(state.resultsRight).toBeCloseTo(state.trackLeft, 0);
      expect(state.trackRight).toBeCloseTo(state.shellRight, 0);
      expect(state.buttonRight).toBeCloseTo(state.shellRight, 0);
      expect(state.documentWidth).toBeLessThanOrEqual(state.viewportWidth);
      expect(state.resultsScrollWidth).toBeLessThanOrEqual(
        state.resultsClientWidth,
      );
    }

    expect(withOverflow.cardLeft).toBeCloseTo(withoutOverflow.cardLeft, 0);
    expect(withOverflow.cardRight).toBeCloseTo(withoutOverflow.cardRight, 0);
    expect(withOverflow.cardWidth).toBeCloseTo(withoutOverflow.cardWidth, 0);
    expect(afterOverflow.cardLeft).toBeCloseTo(withoutOverflow.cardLeft, 0);
    expect(afterOverflow.cardRight).toBeCloseTo(withoutOverflow.cardRight, 0);
    expect(afterOverflow.cardWidth).toBeCloseTo(withoutOverflow.cardWidth, 0);
    expect(withOverflow.trackBackground).toBe("rgba(0, 0, 0, 0)");
    expect(withOverflow.trackLeft).toBeCloseTo(withoutOverflow.trackLeft, 0);
    expect(withOverflow.trackRight).toBeCloseTo(withoutOverflow.trackRight, 0);
    expect(afterOverflow.trackLeft).toBeCloseTo(withoutOverflow.trackLeft, 0);
    expect(afterOverflow.trackRight).toBeCloseTo(withoutOverflow.trackRight, 0);
    expect(afterOverflow.trackHeight).toBeCloseTo(
      afterOverflow.actualContentHeight,
      0,
    );
    expect(afterOverflow.appShellHeight).toBeLessThan(
      afterOverflow.viewportHeight - 80,
    );
    expect(afterOverflow.appShellHeight).toBeCloseTo(
      afterOverflow.naturalAppShellHeight,
      0,
    );
  }

  async expectEmptyResultsShellDoesNotGrowWithViewport(): Promise<void> {
    const page = this.results.page();
    const shell = page.locator("#app-shell");

    await page.setViewportSize({ width: 1280, height: 700 });
    await this.expectSearchViewActive();
    await expect(this.results.locator(".result-card")).toHaveCount(0);
    await expect(this.resultsFooter).toBeEmpty();
    await expect(this.resultsFooter).toBeHidden();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    const initialShellHeight = await shell.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    await expect(this.results.locator(".result-card")).toHaveCount(0);
    await expect(this.resultsFooter).toBeEmpty();
    await expect(this.resultsFooter).toBeHidden();

    const increasedShellHeight = await shell.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(increasedShellHeight).toBeLessThanOrEqual(initialShellHeight + 1);
  }

  async expectEmptyResultsLayoutAtWidth(
    width: number,
    populatedShellHeight?: number,
  ): Promise<number> {
    const page = this.results.page();
    await page.setViewportSize({ width, height: 1200 });
    await expect(this.results).toBeEmpty();
    await expect(this.resultsFooter).toBeHidden();

    await expect
      .poll(async () => {
        const layout = await this.appShell.evaluate((shell) => {
          const resultsShell = document.getElementById("results-scroll-shell");
          if (!resultsShell) throw new Error("Results shell is missing");
          const shellStyle = getComputedStyle(shell);
          const shellBox = shell.getBoundingClientRect();
          const resultsBox = resultsShell.getBoundingClientRect();
          return {
            resultsHeight: resultsBox.height,
            bottomGap:
              shellBox.bottom -
              resultsBox.bottom -
              Number.parseFloat(shellStyle.paddingBottom) -
              Number.parseFloat(shellStyle.borderBottomWidth),
            shellHeight: shellBox.height,
          };
        });
        return width > 768
          ? Math.abs(layout.resultsHeight) <= 1 &&
              Math.abs(layout.bottomGap) <= 1
          : layout.resultsHeight <= 1 && layout.shellHeight >= 1200;
      })
      .toBe(true);

    const height = await this.appShell.evaluate(
      (shell) => shell.getBoundingClientRect().height,
    );
    if (populatedShellHeight !== undefined) {
      expect(height).toBeLessThan(populatedShellHeight - 1);
    }
    return height;
  }

  async expectResultsGrowAtWidth(
    width: number,
    emptyShellHeight: number,
  ): Promise<number> {
    await this.results.page().setViewportSize({ width, height: 1200 });
    await expect(this.results.locator(".result-card")).not.toHaveCount(0);
    await expect
      .poll(() =>
        this.appShell.evaluate((shell) => shell.getBoundingClientRect().height),
      )
      .toBeGreaterThan(emptyShellHeight + 1);
    const layout = await this.resultsScrollShell.evaluate((shell) => {
      const card = shell.querySelector(".result-card");
      if (!card) throw new Error("Result card is missing");
      return {
        height: shell.getBoundingClientRect().height,
        cardHeight: card.getBoundingClientRect().height,
      };
    });
    expect(layout.height).toBeGreaterThanOrEqual(
      Math.max(120, layout.cardHeight) - 1,
    );
    return this.appShell.evaluate(
      (shell) => shell.getBoundingClientRect().height,
    );
  }

  async expectNonCardResultsUseContentHeight(): Promise<void> {
    await expect(this.results.locator(".result-card")).toHaveCount(0);
    await expect(this.results.locator(".no-results-card")).toBeVisible();
    await expect
      .poll(() =>
        this.results.evaluate((results) => {
          const child = results.querySelector(".no-results-card");
          if (!child) throw new Error("No-results message is missing");
          const resultsBox = results.getBoundingClientRect();
          const childBox = child.getBoundingClientRect();
          const contentHeight =
            childBox.bottom -
            resultsBox.top +
            results.scrollTop +
            Number.parseFloat(getComputedStyle(child).marginBottom);
          return Math.abs(resultsBox.height - contentHeight);
        }),
      )
      .toBeLessThanOrEqual(1);
  }

  async expectResponsiveScrollingAtHeight(
    height: number,
    adminContent: Locator,
    documentShouldScroll: boolean,
    expectResultsOverflow: boolean,
  ): Promise<void> {
    const page = this.adminLink.page();
    await page.setViewportSize({ width: 1280, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    const searchLayout = await page.evaluate(() => {
      const shell = document.getElementById("app-shell");
      const header = document.getElementById("app-header");
      const heading = document.getElementById("search-heading");
      const searchControls = document.querySelector(".form");
      const button = document.getElementById("search-button");
      const results = document.getElementById("results");
      const footer = document.getElementById("results-footer");
      const firstCard = results?.querySelector(".result-card");

      if (
        !shell ||
        !header ||
        !heading ||
        !searchControls ||
        !button ||
        !results ||
        !footer ||
        !firstCard
      ) {
        throw new Error("Search viewport measurement elements are missing");
      }

      const bounds = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      };
      const minimumShellHeight =
        bounds(results).top -
        bounds(shell).top +
        Math.max(120, bounds(firstCard).height) +
        bounds(footer).height +
        Number.parseFloat(getComputedStyle(footer).marginTop) +
        Number.parseFloat(getComputedStyle(footer).marginBottom) +
        Number.parseFloat(getComputedStyle(shell).paddingBottom);

      results.scrollTop = 0;
      const initialResultsScrollTop = results.scrollTop;
      results.scrollTop = results.scrollHeight;

      return {
        viewportHeight: document.documentElement.clientHeight,
        documentHeight: document.documentElement.scrollHeight,
        documentScrollTop: window.scrollY,
        shellHeight: bounds(shell).height,
        minimumShellHeight,
        header: bounds(header),
        heading: bounds(heading),
        controls: bounds(searchControls),
        button: bounds(button),
        results: {
          ...bounds(results),
          scrollHeight: results.scrollHeight,
          initialScrollTop: initialResultsScrollTop,
          scrollTop: results.scrollTop,
        },
        footer: bounds(footer),
        firstCardHeight: bounds(firstCard).height,
      };
    });
    expect(searchLayout.header.height).toBeGreaterThan(0);
    expect(searchLayout.controls.height).toBeGreaterThan(0);
    expect(searchLayout.button.height).toBeGreaterThan(0);
    expect(searchLayout.heading.bottom).toBeLessThanOrEqual(
      searchLayout.controls.top,
    );
    expect(searchLayout.button.bottom).toBeLessThanOrEqual(
      searchLayout.results.top,
    );
    expect(searchLayout.results.height).toBeGreaterThanOrEqual(
      searchLayout.firstCardHeight,
    );
    expect(searchLayout.shellHeight).toBeGreaterThanOrEqual(
      searchLayout.minimumShellHeight - 1,
    );

    if (expectResultsOverflow) {
      expect(searchLayout.results.scrollHeight).toBeGreaterThan(
        searchLayout.results.height,
      );
      expect(searchLayout.results.scrollTop).toBeGreaterThan(
        searchLayout.results.initialScrollTop,
      );
    }

    if (documentShouldScroll) {
      expect(searchLayout.documentHeight).toBeGreaterThan(
        searchLayout.viewportHeight,
      );
      expect(searchLayout.shellHeight).toBeGreaterThan(
        searchLayout.viewportHeight - 80,
      );
      expect(searchLayout.results.scrollTop).toBeGreaterThan(0);

      const documentScroll = await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const root = document.documentElement;
        const header = document.getElementById("app-header");
        const controls = document.querySelector(".form");
        const results = document.getElementById("results");

        if (!header || !controls || !results) {
          throw new Error("Search content became unavailable");
        }

        return {
          scrollTop: window.scrollY,
          maxScrollTop: root.scrollHeight - root.clientHeight,
          headerTop: header.getBoundingClientRect().top,
          controlsBottom: controls.getBoundingClientRect().bottom,
          viewportHeight: root.clientHeight,
        };
      });

      expect(documentScroll.scrollTop).toBeGreaterThan(0);
      expect(documentScroll.scrollTop).toBe(documentScroll.maxScrollTop);
      expect(documentScroll.headerTop).toBeLessThan(
        documentScroll.viewportHeight,
      );
      expect(documentScroll.controlsBottom).toBeLessThan(
        documentScroll.viewportHeight,
      );
    } else {
      expect(searchLayout.documentHeight).toBeLessThanOrEqual(
        searchLayout.viewportHeight + 1,
      );
      expect(searchLayout.shellHeight).toBeCloseTo(
        searchLayout.viewportHeight - 80,
        0,
      );
      expect(searchLayout.results.scrollHeight).toBeGreaterThan(
        searchLayout.results.height,
      );
      expect(searchLayout.results.scrollTop).toBeGreaterThan(0);
      expect(searchLayout.documentScrollTop).toBe(0);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await this.openAdminView();
    await expect(adminContent).toBeVisible();

    const adminLayout = await adminContent.evaluate((content) => {
      const root = document.documentElement;
      const header = document.getElementById("app-header");
      const heading = document.getElementById("policies-heading");
      const table = document.getElementById("plan-policies-table");

      if (!header || !heading || !table) {
        throw new Error("Administration scrolling elements are missing");
      }

      const headerTop = header.getBoundingClientRect().top;
      const headingTop = heading.getBoundingClientRect().top;
      content.scrollTop = content.scrollHeight;

      return {
        viewportHeight: root.clientHeight,
        documentHeight: root.scrollHeight,
        documentScrollTop: window.scrollY,
        contentHeight: content.clientHeight,
        contentScrollHeight: content.scrollHeight,
        contentScrollTop: content.scrollTop,
        headerTop,
        headerTopAfterScroll: header.getBoundingClientRect().top,
        headingTop,
        headingTopAfterScroll: heading.getBoundingClientRect().top,
      };
    });

    const adminContentOverflows =
      adminLayout.contentScrollHeight > adminLayout.contentHeight;
    expect(adminLayout.documentScrollTop).toBe(0);
    if (adminContentOverflows) {
      expect(adminLayout.documentHeight).toBeLessThanOrEqual(
        adminLayout.viewportHeight + 1,
      );
      const documentCanScroll = await page.evaluate(() => {
        const originalScrollTop = window.scrollY;
        window.scrollTo(0, document.documentElement.scrollHeight);
        const scrollTop = window.scrollY;
        window.scrollTo(0, originalScrollTop);
        return scrollTop > 0;
      });
      expect(documentCanScroll).toBe(false);
      expect(adminLayout.contentScrollTop).toBeGreaterThan(0);
    } else {
      expect(adminLayout.documentHeight).toBeLessThanOrEqual(
        adminLayout.viewportHeight + 1,
      );
      expect(adminLayout.contentScrollTop).toBe(0);
      expect(adminLayout.headerTopAfterScroll).toBe(adminLayout.headerTop);
      expect(adminLayout.headingTopAfterScroll).toBe(adminLayout.headingTop);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await this.returnToSearchView();
  }

  async expectResultsFooterFixedAndDynamic(): Promise<void> {
    const page = this.results.page();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect
      .poll(() =>
        this.results.evaluate((results) => {
          const footer = document.getElementById("results-footer");
          return footer !== null && !results.contains(footer);
        }),
      )
      .toBe(true);

    const measure = () =>
      this.results.evaluate((results) => {
        const footer = document.getElementById("results-footer");
        const shell = document.getElementById("app-shell");
        const firstCard = results.querySelector(".result-card");

        if (!footer || !shell || !firstCard) {
          throw new Error("Results footer layout elements are missing");
        }

        const footerRect = footer.getBoundingClientRect();
        const resultsRect = results.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const shellStyle = getComputedStyle(shell);

        return {
          footerHeight: footerRect.height,
          footerTop: footerRect.top,
          footerBottom: footerRect.bottom,
          resultsBottom: resultsRect.bottom,
          resultsHeight: results.clientHeight,
          resultsScrollHeight: results.scrollHeight,
          firstCardHeight: firstCard.getBoundingClientRect().height,
          shellHeight: shellRect.height,
          shellMinimumHeight: Number.parseFloat(
            getComputedStyle(shell).minHeight,
          ),
          shellContentBottom:
            shellRect.bottom -
            Number.parseFloat(shellStyle.paddingBottom) -
            Number.parseFloat(shellStyle.borderBottomWidth),
          viewportHeight: document.documentElement.clientHeight,
          documentHeight: document.documentElement.scrollHeight,
        };
      });

    const singleLineText = await this.resultsFooter.textContent();
    const singleLine = await measure();
    expect(singleLine.footerHeight).toBeGreaterThan(0);
    expect(singleLine.footerBottom).toBeCloseTo(
      singleLine.shellContentBottom,
      0,
    );

    await this.resultsFooter.evaluate((footer) => {
      const timestamp = document.createElement("div");
      timestamp.className = "meta-info saved-search-info";
      timestamp.textContent = "Saved search: 11/6/2026, 11:22:03 PM. ";

      const warning = document.createElement("div");
      warning.className = "price-change-warning";
      warning.textContent = "Prices may have changed.";
      timestamp.appendChild(warning);
      footer.appendChild(timestamp);
    });
    await expect(this.resultsFooter).toContainText("Finished");
    await expect(this.resultsFooter.getByText(/^Saved search:/)).toBeVisible();
    await expect(
      this.resultsFooter.getByText("Prices may have changed."),
    ).toBeVisible();
    await expect
      .poll(() => this.resultsFooter.evaluate((footer) => footer.clientHeight))
      .toBeGreaterThan(singleLine.footerHeight);
    const footerWithMessages = await measure();
    const messagePositions = await this.resultsFooter.evaluate((footer) => {
      const timestamp = footer.querySelector(".saved-search-info");
      const warning = footer.querySelector(".price-change-warning");
      if (!timestamp || !warning) {
        throw new Error("Saved-search footer messages are missing");
      }

      return {
        timestampTop: timestamp.getBoundingClientRect().top,
        warningTop: warning.getBoundingClientRect().top,
      };
    });
    expect(footerWithMessages.footerHeight).toBeGreaterThan(
      singleLine.footerHeight,
    );

    await this.results.evaluate((results) => {
      results.scrollTop = results.scrollHeight;
    });
    await expect
      .poll(() => this.results.evaluate((results) => results.scrollTop))
      .toBeGreaterThan(0);
    const scrolledFooter = await measure();
    expect(scrolledFooter.footerTop).toBe(footerWithMessages.footerTop);
    expect(scrolledFooter.footerBottom).toBe(footerWithMessages.footerBottom);
    expect(scrolledFooter.resultsBottom).toBeLessThanOrEqual(
      scrolledFooter.footerTop,
    );
    expect(scrolledFooter.resultsScrollHeight).toBeGreaterThan(
      scrolledFooter.resultsHeight,
    );
    const scrolledMessagePositions = await this.resultsFooter.evaluate(
      (footer) => {
        const timestamp = footer.querySelector(".saved-search-info");
        const warning = footer.querySelector(".price-change-warning");
        if (!timestamp || !warning) {
          throw new Error("Saved-search footer messages are missing");
        }

        return {
          timestampTop: timestamp.getBoundingClientRect().top,
          warningTop: warning.getBoundingClientRect().top,
        };
      },
    );
    expect(scrolledMessagePositions.timestampTop).toBe(
      messagePositions.timestampTop,
    );
    expect(scrolledMessagePositions.warningTop).toBe(
      messagePositions.warningTop,
    );

    const wrappedStatus = `${singleLineText ?? "Finished"} ${"Additional search status details ".repeat(24)}`;
    await this.resultsFooter.evaluate((footer, text) => {
      if (!(footer instanceof HTMLElement)) {
        throw new Error("Results footer is not an HTML element");
      }

      footer.hidden = false;
      footer.textContent = text;
    }, wrappedStatus);
    await expect
      .poll(() =>
        this.resultsFooter.evaluate(
          (footer) => footer.getBoundingClientRect().height,
        ),
      )
      .toBeGreaterThan(singleLine.footerHeight);
    const multiLine = await measure();
    expect(multiLine.footerHeight).toBeGreaterThan(singleLine.footerHeight);
    expect(multiLine.resultsHeight).toBeLessThan(singleLine.resultsHeight);
    expect(multiLine.resultsHeight).toBeGreaterThanOrEqual(
      multiLine.firstCardHeight,
    );
    expect(multiLine.footerBottom).toBeCloseTo(multiLine.shellContentBottom, 0);

    await page.setViewportSize({ width: 1280, height: 500 });
    await expect
      .poll(() =>
        this.results.evaluate((results) => {
          const shell = document.getElementById("app-shell");
          const card = results.querySelector(".result-card");
          return Boolean(
            shell &&
            card &&
            results.clientHeight >= card.getBoundingClientRect().height,
          );
        }),
      )
      .toBe(true);
    const shortViewport = await measure();
    expect(shortViewport.resultsHeight).toBeGreaterThanOrEqual(
      shortViewport.firstCardHeight,
    );
    expect(shortViewport.shellHeight).toBeGreaterThanOrEqual(
      shortViewport.shellMinimumHeight - 1,
    );
    expect(shortViewport.documentHeight).toBeGreaterThan(
      shortViewport.viewportHeight,
    );
    expect(shortViewport.resultsBottom).toBeLessThanOrEqual(
      shortViewport.footerTop,
    );
    expect(shortViewport.footerBottom).toBeLessThanOrEqual(
      shortViewport.shellContentBottom + 1,
    );

    await this.resultsFooter.evaluate((footer, text) => {
      if (!(footer instanceof HTMLElement)) {
        throw new Error("Results footer is not an HTML element");
      }

      footer.textContent = text ?? "";
      footer.hidden = !text;
    }, singleLineText);
    await page.setViewportSize({ width: 1280, height: 1400 });
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
