import { test } from "@playwright/test";
import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";
import ResetPasswordPage from "../pages/reset-password.page";
import {
  createTestUser,
  createTestUserWithResetToken,
  createUniqueTestEmail,
  createVerifiedTestUserWithResetToken,
} from "../helpers/user.helper";

test.describe("Authentication - Forgot Password", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;
  let resetPassword: ResetPasswordPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);
    resetPassword = new ResetPasswordPage(page);

    await common.openPage(Env.test);
  });

  test("TC-FORGOT-01 | should show success message for existing email", async () => {
    const user = await createTestUser();

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await common.click(auth.loginForgotPasswordButton);
    await common.expectVisible(auth.forgotPasswordFormContainer);
    await common.fill(auth.forgotPasswordEmailInput, user.email);
    await common.click(auth.forgotPasswordSubmitButton);
    await common.expectContainsText(
      auth.forgotPasswordMessage,
      "If the email address is registered, a password reset email has been sent.",
    );
  });

  test("TC-FORGOT-02 | should show success message for non-existing email", async () => {
    const email = createUniqueTestEmail("e2e-nonexistent");

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await common.click(auth.loginForgotPasswordButton);
    await common.expectVisible(auth.forgotPasswordFormContainer);
    await common.fill(auth.forgotPasswordEmailInput, email);
    await common.click(auth.forgotPasswordSubmitButton);
    await common.expectContainsText(
      auth.forgotPasswordMessage,
      "If the email address is registered, a password reset email has been sent.",
    );
  });

  test("TC-FORGOT-03 | should open reset page with a valid reset token", async () => {
    const user = await createTestUserWithResetToken();

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);
    await resetPassword.expectResetFormEnabled();
  });

  test("TC-FORGOT-04 | should get error on reset page with an invalid reset token", async () => {
    await common.openPage(`${Env.test}reset-password/i-n-v-a-l-i-d-t-o-k-e-n`);
    await common.expectContainsText(
      resetPassword.resetMessage,
      "Invalid or expired password reset token.",
    );
    await resetPassword.expectResetFormDisabled();
  });

  test("TC-FORGOT-05 | should reset password successfully", async () => {
    const user = await createTestUserWithResetToken();
    const newPassword = "NewPassword1";

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await resetPassword.expectResetFormEnabled();

    await common.fill(resetPassword.newPasswordInput, newPassword);
    await common.click(resetPassword.resetButton);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Password reset successfully.",
    );
    await resetPassword.expectResetFormDisabled();
  });

  test("TC-FORGOT-06 | should login with new password after reset", async () => {
    const user = await createVerifiedTestUserWithResetToken();
    const newPassword = "NewPassword1";

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await resetPassword.expectResetFormEnabled();

    await common.fill(resetPassword.newPasswordInput, newPassword);
    await common.click(resetPassword.resetButton);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Password reset successfully.",
    );

    await common.openPage(Env.test);

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, newPassword);
    await common.click(auth.loginSubmitButton);

    await common.expectVisible(flightFinder.logoutButton);
  });

  test("TC-FORGOT-07 | should not login with old password after reset", async () => {
    const user = await createVerifiedTestUserWithResetToken();
    const newPassword = "NewPassword1";

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await resetPassword.expectResetFormEnabled();

    await common.fill(resetPassword.newPasswordInput, newPassword);
    await common.click(resetPassword.resetButton);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Password reset successfully.",
    );

    await common.openPage(Env.test);

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);

    await common.expectVisible(auth.authModal);
    await common.expectContainsText(
      auth.loginMessage,
      "Invalid email or password.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-FORGOT-08 | should allow password reset for unverified user", async () => {
    const user = await createTestUserWithResetToken();
    const newPassword = "NewPassword1";

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await resetPassword.expectResetFormEnabled();

    await common.fill(resetPassword.newPasswordInput, newPassword);
    await common.click(resetPassword.resetButton);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Password reset successfully.",
    );

    await common.openPage(Env.test);

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, newPassword);
    await common.click(auth.loginSubmitButton);

    await common.expectVisible(auth.authModal);
    await common.expectContainsText(
      auth.loginMessage,
      "Please verify your email before logging in.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-FORGOT-09 | should allow password reset token to be used only once", async () => {
    const user = await createTestUserWithResetToken();
    const newPassword = "NewPassword1";

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await resetPassword.expectResetFormEnabled();

    await common.fill(resetPassword.newPasswordInput, newPassword);
    await common.click(resetPassword.resetButton);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Password reset successfully.",
    );

    await common.openPage(`${Env.test}reset-password/${user.resetToken}`);

    await common.expectContainsText(
      resetPassword.resetMessage,
      "Invalid or expired password reset token.",
    );

    await resetPassword.expectResetFormDisabled();
  });
});
