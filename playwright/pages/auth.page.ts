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

  async fillRegisterForm(email: string, password: string): Promise<void> {
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
  }

  async setInvalidAuthToken(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem("authToken", "invalid-token");
    });
  }

  async expectAuthTokenRemoved(): Promise<void> {
    await expect
      .poll(async () =>
        this.page.evaluate(() => localStorage.getItem("authToken")),
      )
      .toBeNull();
  }
}
