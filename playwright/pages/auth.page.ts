import { Locator, Page, expect } from "@playwright/test";

export default class AuthPage {
  readonly page: Page;

  readonly authModal: Locator;

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

  async login(email: string, password: string): Promise<void> {
    await this.loginButton.click();
    await this.fillLoginForm(email, password);
    await this.loginSubmitButton.click();

    await expect(this.authModal).toBeHidden();
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
