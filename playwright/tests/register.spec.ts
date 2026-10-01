import { test } from "@playwright/test";
import Env from "../utils/env";
import AuthPage from "../pages/auth.page";
import { createTestUser, createUniqueTestEmail } from "../helpers/user.helper";

test.describe("Authentication - Register", () => {
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("TC-REGISTER-01 | should register a new user successfully", async () => {
    const email = createUniqueTestEmail("e2e-register");
    const password = "TestPassword1";

    await auth.clickRegisterButton();

    await auth.expectAuthModalVisible();
    await auth.expectRegisterFormVisible();

    await auth.fillRegisterForm(email, password);
    await auth.submitRegisterForm();

    await auth.expectLoginFormVisible();

    await auth.expectLoginMessage(
      "Registration successful. Please check your email to verify your account.",
    );
  });

  test("TC-REGISTER-02 | should not register with an already registered email", async () => {
    const user = await createTestUser();

    await auth.clickRegisterButton();

    await auth.expectAuthModalVisible();
    await auth.expectRegisterFormVisible();

    await auth.fillRegisterForm(user.email, user.password);
    await auth.submitRegisterForm();

    await auth.expectRegisterMessage("Email already registered.");

    await auth.expectAuthModalVisible();
    await auth.expectRegisterFormVisible();
  });
});
