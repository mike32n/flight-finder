import { Locator, Page, expect } from "@playwright/test";

type CloseButtonSize = { width: number; height: number };

export type HeldLoginResponse = {
  waitUntilRequested: () => Promise<void>;
  waitUntilProcessed: () => Promise<void>;
  release: () => void;
};

export default class AuthPage {
  readonly page: Page;

  readonly authModal: Locator;
  readonly authModalContent: Locator;
  readonly authModalClose: Locator;

  readonly loginFormContainer: Locator;
  readonly loginButton: Locator;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly loginForgotPasswordButton: Locator;
  readonly loginMessage: Locator;

  readonly registerFormContainer: Locator;
  readonly registerButton: Locator;
  readonly registerForm: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerSubmitButton: Locator;
  readonly registerMessage: Locator;

  readonly forgotPasswordFormContainer: Locator;
  readonly forgotPasswordForm: Locator;
  readonly forgotPasswordEmailInput: Locator;
  readonly forgotPasswordSubmitButton: Locator;
  readonly forgotPasswordMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.authModal = page.locator("#auth-modal");
    this.authModalContent = this.authModal.locator(".auth-modal-content");
    this.authModalClose = this.authModal.locator("#auth-modal-close");

    this.loginFormContainer = page.locator("#login-form-container");
    this.loginButton = page.getByRole("button", {
      name: "Login",
      exact: true,
    });
    this.loginEmailInput = page.locator("#login-email");
    this.loginPasswordInput = page.locator("#login-password");
    this.loginSubmitButton = this.loginFormContainer.getByRole("button", {
      name: "Login",
      exact: true,
    });
    this.loginForgotPasswordButton = page.locator("#forgot-password-btn");
    this.loginMessage = page.locator("#login-message");

    this.registerFormContainer = page.locator("#register-form-container");
    this.registerButton = page.getByRole("button", {
      name: "Register",
      exact: true,
    });
    this.registerForm = page.locator("#register-form");
    this.registerEmailInput = page.locator("#register-email");
    this.registerPasswordInput = page.locator("#register-password");
    this.registerSubmitButton = this.registerForm.getByRole("button", {
      name: "Register",
      exact: true,
    });
    this.registerMessage = page.locator("#register-message");
    this.forgotPasswordFormContainer = page.locator("#forgot-form-container");
    this.forgotPasswordForm = page.locator("#forgot-form");
    this.forgotPasswordEmailInput = page.locator("#forgot-email");
    this.forgotPasswordSubmitButton = this.forgotPasswordForm.getByRole(
      "button",
      {
        name: "Send Reset Link",
        exact: true,
      },
    );
    this.forgotPasswordMessage = page.locator("#forgot-message");
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
  }

  async expectModalCloseAtWidth(
    width: number,
    desktopSize?: CloseButtonSize,
  ): Promise<CloseButtonSize> {
    await this.page.setViewportSize({ width, height: 900 });
    let closeSize: CloseButtonSize | undefined;

    for (const mode of ["login", "register", "forgot"] as const) {
      if (mode === "register") {
        await this.registerButton.click();
        await expect(this.registerFormContainer).toBeVisible();
      } else {
        await this.loginButton.click();
        await expect(this.loginFormContainer).toBeVisible();
        if (mode === "forgot") {
          await this.loginForgotPasswordButton.click();
          await expect(this.forgotPasswordFormContainer).toBeVisible();
        }
      }

      await expect(this.authModalClose).toBeVisible();
      const layout = await this.authModalContent.evaluate((content) => {
        const close = content.querySelector("#auth-modal-close");
        if (!close)
          throw new Error("Authentication modal close button is missing");
        const modalBox = content.getBoundingClientRect();
        const closeBox = close.getBoundingClientRect();
        return {
          width: closeBox.width,
          height: closeBox.height,
          modalWidth: modalBox.width,
          leftOffset: closeBox.left - modalBox.left,
          rightOffset: modalBox.right - closeBox.right,
          topOffset: closeBox.top - modalBox.top,
        };
      });

      expect(layout.topOffset).toBeCloseTo(8, 1);
      expect(layout.rightOffset).toBeCloseTo(12, 1);
      expect(layout.leftOffset).toBeGreaterThan(layout.modalWidth / 2);
      if (desktopSize) {
        expect(layout.width).toBeCloseTo(desktopSize.width, 1);
        expect(layout.height).toBeCloseTo(desktopSize.height, 1);
      }
      if (closeSize) {
        expect(layout.width).toBeCloseTo(closeSize.width, 1);
        expect(layout.height).toBeCloseTo(closeSize.height, 1);
      }
      closeSize = { width: layout.width, height: layout.height };

      await this.authModalClose.click();
      await expect(this.authModal).toBeHidden();
    }

    if (!closeSize) throw new Error("Authentication modal was not measured");
    return closeSize;
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginButton.click();
    await this.fillLoginForm(email, password);
    await this.loginSubmitButton.click();

    await expect(this.authModal).toBeHidden();
  }

  async beginLogin(email: string, password: string): Promise<void> {
    await this.loginButton.click();
    await this.fillLoginForm(email, password);
    await this.loginSubmitButton.click();
  }

  async holdNextLoginResponse(): Promise<HeldLoginResponse> {
    let release!: () => void;
    let requested!: () => void;
    let responseFinished!: Promise<void>;
    let held = false;
    let released = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const arrived = new Promise<void>((resolve) => {
      requested = resolve;
    });

    await this.page.route("**/api/auth/login", async (route) => {
      if (held) {
        await route.fallback();
        return;
      }

      held = true;
      responseFinished = this.page
        .waitForResponse((response) => response.request() === route.request())
        .then(async (response) => {
          await response.finished();
        });
      requested();
      await gate;
      await route.continue();
    });

    return {
      waitUntilRequested: () => arrived,
      waitUntilProcessed: async () => {
        await responseFinished;
        await this.page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            }),
        );
      },
      release: () => {
        if (!released) {
          released = true;
          release();
        }
      },
    };
  }

  async openSharedSessionPage(url: string): Promise<AuthPage> {
    const page = await this.page.context().newPage();
    const auth = new AuthPage(page);
    await page.goto(url);
    return auth;
  }

  async closePage(): Promise<void> {
    await this.page.close();
  }

  async expectAuthenticatedUser(email: string): Promise<void> {
    await expect(this.page.locator("#auth-user-email")).toHaveText(email);
  }

  async expectSameAuthToken(other: AuthPage): Promise<void> {
    const [token, otherToken] = await Promise.all([
      this.page.evaluate(() => localStorage.getItem("authToken")),
      other.page.evaluate(() => localStorage.getItem("authToken")),
    ]);

    expect(token).not.toBeNull();
    expect(token).toBe(otherToken);
  }

  async expectLoginFormOpen(): Promise<void> {
    await expect(this.authModal).toBeVisible();
    await expect(this.loginFormContainer).toBeVisible();
  }

  async expectLoginSubmitEnabled(): Promise<void> {
    await expect(this.loginSubmitButton).toBeEnabled();
  }

  async loginViaApi(email: string, password: string): Promise<void> {
    const response = await this.page.request.post(
      new URL("/api/auth/login", this.page.url()).href,
      {
        data: { email, password },
      },
    );

    await expect(response).toBeOK();

    const data = await response.json();

    await this.page.evaluate((token: string) => {
      localStorage.setItem("authToken", token);
    }, data.token);
  }

  async fillRegisterForm(email: string, password: string): Promise<void> {
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
  }

  async setInvalidAuthToken(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem("authToken", "invalid-token");
    });
  }

  async setAuthTokenFromAnotherTab(token: string | null): Promise<void> {
    const otherPage = await this.page.context().newPage();

    try {
      await otherPage.goto(this.page.url());

      await otherPage.evaluate((value: string | null) => {
        if (value === null) {
          localStorage.removeItem("authToken");
        } else {
          localStorage.setItem("authToken", value);
        }
      }, token);
    } finally {
      await otherPage.close();
    }
  }

  async mockCurrentUserFailure(failure: 401 | 500 | "network"): Promise<void> {
    await this.page.route("**/api/auth/me", async (route) => {
      if (failure === "network") {
        await route.abort("failed");
        return;
      }

      await route.fulfill({
        status: failure,
        json: {
          success: false,
          message:
            failure === 401
              ? "Invalid or expired authentication token."
              : "Internal server error.",
        },
      });
    });
  }

  async clearCurrentUserMock(): Promise<void> {
    await this.page.unroute("**/api/auth/me");
  }

  async expectAuthTokenPresent(): Promise<void> {
    await expect
      .poll(() => this.page.evaluate(() => localStorage.getItem("authToken")))
      .toBeTruthy();
  }

  async expectAuthTokenRemoved(): Promise<void> {
    await expect
      .poll(async () =>
        this.page.evaluate(() => localStorage.getItem("authToken")),
      )
      .toBeNull();
  }
}
