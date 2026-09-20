import { Locator, Page, expect } from "@playwright/test";

export default class AuthPage {
  readonly page: Page;
  readonly authModal: Locator;
  readonly loginFormContainer: Locator;
  readonly registerFormContainer: Locator;
  readonly registerButton: Locator;
  readonly registerForm: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerSubmitButton: Locator;
  readonly registerMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.authModal = page.locator("#auth-modal");
    this.loginFormContainer = page.locator("#login-form-container");
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

  async expectAuthModalVisible(): Promise<void> {
    await expect(this.authModal).toBeVisible();
  }

  async expectRegisterFormVisible(): Promise<void> {
    await expect(this.registerFormContainer).toBeVisible();
  }

  async expectRegistrationSuccessMessage(): Promise<void> {
    await expect(this.registerMessage).toHaveText(
      "Registration successful. Please check your email to verify your account.",
    );
  }

  async expectRegisterFormEmpty(): Promise<void> {
    await expect(this.registerEmailInput).toHaveValue("");
    await expect(this.registerPasswordInput).toHaveValue("");
  }
}
