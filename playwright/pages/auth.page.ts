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

  async clickLoginButton(): Promise<void> {
    await this.loginButton.click();
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
  }

  async submitLoginForm(): Promise<void> {
    await this.loginSubmitButton.click();
  }

  async clickRegisterButton(): Promise<void> {
    await this.registerButton.click();
  }

  async fillRegisterForm(email: string, password: string): Promise<void> {
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
  }

  async submitRegisterForm(): Promise<void> {
    await this.registerSubmitButton.click();
  }

  async clickForgotPasswordButton(): Promise<void> {
    await this.loginForgotPasswordButton.click();
  }

  async fillForgotPasswordForm(email: string): Promise<void> {
    await this.forgotPasswordEmailInput.fill(email);
  }

  async submitForgotPasswordForm(): Promise<void> {
    await this.forgotPasswordSubmitButton.click();
  }

  async expectAuthModalVisible(): Promise<void> {
    await expect(this.authModal).toBeVisible();
  }

  async expectAuthModalHidden(): Promise<void> {
    await expect(this.authModal).toBeHidden();
  }

  async expectLoginFormVisible(): Promise<void> {
    await expect(this.loginFormContainer).toBeVisible();
  }

  async expectLoginErrorMessage(message: string): Promise<void> {
    await expect(this.loginMessage).toContainText(message);
  }

  async expectRegisterFormVisible(): Promise<void> {
    await expect(this.registerFormContainer).toBeVisible();
  }

  async expectRegisterMessage(message: string): Promise<void> {
    await expect(this.registerMessage).toContainText(message);
  }

  async expectRegisterFormEmpty(): Promise<void> {
    await expect(this.registerEmailInput).toHaveValue("");
    await expect(this.registerPasswordInput).toHaveValue("");
  }

  async expectForgotPasswordFormVisible(): Promise<void> {
    await expect(this.forgotPasswordFormContainer).toBeVisible();
  }

  async expectForgotPasswordSuccessMessage(message: string): Promise<void> {
    await expect(this.forgotPasswordMessage).toContainText(message);
  }
}
