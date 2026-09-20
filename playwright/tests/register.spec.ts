import { test } from "@playwright/test";
import Env from "../utils/env";
import MainPage from "../pages/main.page";
import AuthPage from "../pages/auth.page";

test.describe("Authentication - Register", () => {
  let main: MainPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("should register a new user successfully", async () => {
    const email = `e2e-register-${Date.now()}@example.com`;
    const password = "TestPassword1";

    await auth.clickRegisterButton();

    await auth.expectAuthModalVisible();
    await auth.expectRegisterFormVisible();

    await auth.fillRegisterForm(email, password);
    await auth.submitRegisterForm();

    await auth.expectRegistrationSuccessMessage();
    await auth.expectRegisterFormEmpty();
  });
});
