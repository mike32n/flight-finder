import { test } from "@playwright/test";
import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import MainPage from "../pages/main.page";
import AuthPage from "../pages/auth.page";
import ResetPage from "../pages/reset.page";
import {
  createTestUser,
  createTestUserWithResetToken,
} from "../helpers/user.helper";

test.describe("Authentication - Forgot Password", () => {
  let main: MainPage;
  let auth: AuthPage;
  let common: CommonPage;
  let reset: ResetPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);
    auth = new AuthPage(page);
    common = new CommonPage(page);
    reset = new ResetPage(page);

    await page.goto(Env.test);
  });

  test("TC-FORGOT-01 | should show success message for existing email", async () => {
    const user = await createTestUser();

    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.clickForgotPasswordButton();
    await auth.expectForgotPasswordFormVisible();
    await auth.fillForgotPasswordForm(user.email);
    await auth.submitForgotPasswordForm();
    await auth.expectForgotPasswordSuccessMessage(
      "If the email address is registered, a password reset email has been sent.",
    );
  });

  test("TC-FORGOT-02 | should show success message for non-existing email", async () => {
    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.clickForgotPasswordButton();
    await auth.expectForgotPasswordFormVisible();
    await auth.fillForgotPasswordForm("nonexistent-email@example.com");
    await auth.submitForgotPasswordForm();
    await auth.expectForgotPasswordSuccessMessage(
      "If the email address is registered, a password reset email has been sent.",
    );
  });

  test("TC-FORGOT-03 | should open reset page with a valid reset token", async () => {
    const user = await createTestUserWithResetToken();

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);
    await reset.expectResetFormEnabled();
  });

  test("TC-FORGOT-04 | should get error on reset page with an invalid reset token", async () => {
    await common.openPage(`${Env.test}reset-password/i-n-v-a-l-i-d-t-o-k-e-n`);
    await reset.expectTokenError();
  });
});
