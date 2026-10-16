import { test } from "@playwright/test";
import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import {
  createTestUser,
  createVerifiedTestUser,
  createUniqueTestEmail,
} from "../helpers/user.helper";

test.describe("Authentication - Register", () => {
  let common: CommonPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("TC-REGISTER-01 | should register a new user successfully", async () => {
    const email = createUniqueTestEmail("e2e-register");
    const password = "TestPassword1";

    await auth.clickRegisterButton();

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.registerFormContainer);

    await auth.fillRegisterForm(email, password);
    await auth.submitRegisterForm();

    await common.expectVisible(auth.loginFormContainer);

    await common.expectContainsText(
      auth.loginMessage,
      "Registration successful. Please check your email to verify your account.",
    );
  });

  test("TC-REGISTER-02 | should not register with an already registered email", async () => {
    const user = await createVerifiedTestUser();

    await auth.clickRegisterButton();

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.registerFormContainer);

    await auth.fillRegisterForm(user.email, user.password);
    await auth.submitRegisterForm();

    await common.expectContainsText(
      auth.registerMessage,
      "Email already registered.",
    );

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.registerFormContainer);
  });

  test("TC-REGISTER-03 | should resend verification for an unverified account with matching password", async () => {
    const user = await createTestUser();

    await auth.clickRegisterButton();
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.registerFormContainer);

    await auth.fillRegisterForm(user.email, user.password);
    await auth.submitRegisterForm();

    await common.expectVisible(auth.loginFormContainer);
    await common.expectContainsText(
      auth.loginMessage,
      "Registration successful. Please check your email to verify your account.",
    );
  });
});
