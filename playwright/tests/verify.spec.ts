import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";
import VerifyPage from "../pages/verify.page";
import { createTestUser } from "../helpers/user.helper";

test.describe("Authentication - Email Verification", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;
  let verify: VerifyPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);
    verify = new VerifyPage(page);
  });

  test("TC-VERIFY-01 | should verify email successfully", async () => {
    const user = await createTestUser();

    await common.openPage(`${Env.test}verify/${user.verificationToken}`);

    await verify.expectVerificationMessage("Email verified successfully.");

    await common.openPage(Env.test);

    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();

    await auth.expectAuthModalHidden();

    await common.expectVisible(flightFinder.logoutButton);
  });

  test("TC-VERIFY-02 | should show error for invalid verification token", async () => {
    await common.openPage(`${Env.test}verify/i-n-v-a-l-i-d-t-o-k-e-n`);

    await verify.expectVerificationMessage("Invalid verification token.");
  });
});
