import { Locator, Page, Response, expect } from "@playwright/test";

type BFCacheLifecycleEvent = {
  persisted: boolean;
  trusted: boolean;
  timestamp: number;
};

declare global {
  interface Window {
    flightFinderBFCacheProbe?: {
      marker: string;
      pagehide: BFCacheLifecycleEvent | null;
      pageshow: BFCacheLifecycleEvent | null;
    };
  }
}

export default class CommonPage {
  readonly page: Page;
  readonly body: Locator;
  private bfcacheMarker: string | null = null;

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

  async fill(element: Locator, value: string): Promise<void> {
    await element.fill(value);
  }

  async press(element: Locator, key: string, times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await element.press(key);
    }
  }

  async setChecked(element: Locator, checked: boolean): Promise<void> {
    await element.setChecked(checked);
  }

  async reloadPage(): Promise<void> {
    await this.page.reload();
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async observeBFCacheLifecycle(): Promise<void> {
    this.bfcacheMarker = await this.page.evaluate(() => {
      const probe = {
        marker: crypto.randomUUID(),
        pagehide: null as BFCacheLifecycleEvent | null,
        pageshow: null as BFCacheLifecycleEvent | null,
      };
      window.flightFinderBFCacheProbe = probe;

      for (const type of ["pagehide", "pageshow"] as const) {
        window.addEventListener(
          type,
          (event) => {
            probe[type] = {
              persisted: event.persisted,
              trusted: event.isTrusted,
              timestamp: performance.now(),
            };
          },
          // Record restoration before the application's pageshow handler fetches /me.
          { capture: true, once: true },
        );
      }

      return probe.marker;
    });
  }

  async openLocalDocument(
    path: string,
    validationPath: string,
  ): Promise<void> {
    const currentUrl = new URL(this.page.url());
    const destination = new URL(path, currentUrl);
    const validationUrl = new URL(validationPath, destination);
    expect(destination.origin).toBe(currentUrl.origin);
    expect(destination.pathname).not.toBe(currentUrl.pathname);

    const [validation] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url() === validationUrl.href &&
          response.request().method() === "GET",
      ),
      this.page.goto(destination.href),
    ]);

    expect(await validation.finished()).toBeNull();
  }

  async goBackAndExpectBFCacheRestore(): Promise<void> {
    const marker = this.bfcacheMarker;
    if (!marker) throw new Error("Attach BFCache observers before navigating away.");

    const verificationUrl = new URL("/api/auth/me", this.page.url()).href;
    let verification: Response | undefined;
    const observeVerification = (response: Response) => {
      if (
        response.url() === verificationUrl &&
        response.request().method() === "GET"
      ) {
        verification = response;
      }
    };
    this.page.on("response", observeVerification);

    try {
      await this.page.goBack({ waitUntil: "commit" });

      await expect
        .poll(
          () =>
            this.page.evaluate((expectedMarker) => {
              const probe = window.flightFinderBFCacheProbe;
              return {
                originalDocumentSurvived: probe?.marker === expectedMarker,
                trustedPagehide: probe?.pagehide?.trusted === true,
                persistedPagehide: probe?.pagehide?.persisted === true,
                trustedPageshow: probe?.pageshow?.trusted === true,
                persistedPageshow: probe?.pageshow?.persisted === true,
              };
            }, marker),
          {
            message:
              "Genuine BFCache restoration requires the original in-memory marker and trusted, persisted pagehide/pageshow events; a reload is not accepted.",
          },
        )
        .toEqual({
          originalDocumentSurvived: true,
          trustedPagehide: true,
          persistedPagehide: true,
          trustedPageshow: true,
          persistedPageshow: true,
        });

      await expect
        .poll(() => verification?.status(), {
          message: "Expected a fresh successful GET /api/auth/me after returning.",
        })
        .toBe(200);
      if (!verification) throw new Error("Session verification was not observed.");
      expect(await verification.finished()).toBeNull();

      await expect
        .poll(
          () =>
            this.page.evaluate((url) => {
              const restoredAt =
                window.flightFinderBFCacheProbe?.pageshow?.timestamp;
              return (
                restoredAt !== undefined &&
                performance
                  .getEntriesByName(url, "resource")
                  .some((entry) => entry.startTime >= restoredAt)
              );
            }, verificationUrl),
          {
            message:
              "Session verification must start after the trusted BFCache pageshow, not before departure.",
          },
        )
        .toBe(true);
    } finally {
      this.page.off("response", observeVerification);
    }
  }

  async simulateCachedPageRestore(): Promise<void> {
    await this.page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );

      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
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

  async expectChecked(element: Locator, checked = true): Promise<void> {
    if (checked) {
      await expect(element).toBeChecked();
    } else {
      await expect(element).not.toBeChecked();
    }
  }

  async expectURL(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url);
  }
}
