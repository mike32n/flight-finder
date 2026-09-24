import { test } from "@playwright/test";
import Env from "../utils/env";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";

test.describe("Authentication - Register", () => {
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("TC-REGISTER-01 | should register a new user successfully", async () => {
    const email = `e2e-register-${Date.now()}@example.com`;
    const password = "TestPassword1";

    await auth.clickRegisterButton();

    await auth.expectAuthModalVisible();
    await auth.expectRegisterFormVisible();

    await auth.fillRegisterForm(email, password);
    await auth.submitRegisterForm();

    await auth.expectRegistrationSuccessMessage(
      "Registration successful. Please check your email to verify your account.",
    );
    await auth.expectRegisterFormEmpty();
  });
});
