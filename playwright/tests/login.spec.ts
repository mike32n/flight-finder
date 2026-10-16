import { test } from "@playwright/test";
import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import FlightFinderPage from "../pages/flight-finder.page";
import AuthPage from "../pages/auth.page";
import {
  createTestUser,
  createVerifiedTestUser,
  createUniqueTestEmail,
} from "../helpers/user.helper";

const { verifyUser } = require("../../models/userModel");

test.describe("Authentication - Login", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);

    await common.openPage(Env.test);
  });

  test("TC-LOGIN-01 | should login an existing user successfully", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await common.click(auth.loginButton);

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await common.click(auth.loginSubmitButton);
    await common.expectHidden(auth.authModal);

    await common.expectVisible(flightFinder.logoutButton);
  });

  test("TC-LOGIN-02 | should not login with invalid password", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await common.click(auth.loginButton);

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(verifiedUser.email, "WrongPassword");
    await common.click(auth.loginSubmitButton);
    await common.expectVisible(auth.authModal);
    await common.expectContainsText(
      auth.loginMessage,
      "Invalid email or password.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-03 | should not login with unverified user", async () => {
    const user = await createTestUser();

    await common.click(auth.loginButton);

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);
    await common.expectVisible(auth.authModal);
    await common.expectContainsText(
      auth.loginMessage,
      "Please verify your email before logging in.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-04 | should not login with non-existent user", async () => {
    const email = createUniqueTestEmail("e2e-nonexistent");

    await common.click(auth.loginButton);
    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(email, "SomePassword1");
    await common.click(auth.loginSubmitButton);
    await common.expectVisible(auth.authModal);
    await common.expectContainsText(
      auth.loginMessage,
      "Invalid email or password.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-05 | should logout successfully", async () => {
    const user = await createTestUser();
    await verifyUser(user.userId);

    await common.click(auth.loginButton);

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);

    await common.expectHidden(auth.authModal);

    await common.expectVisible(flightFinder.logoutButton);

    await common.click(flightFinder.logoutButton);

    await common.expectHidden(flightFinder.logoutButton);

    await auth.expectAuthTokenRemoved();
  });

  test("TC-LOGIN-06 | should restore authenticated session after page reload", async () => {
    const user = await createTestUser();

    await verifyUser(user.userId);

    await common.click(auth.loginButton);

    await common.expectVisible(auth.authModal);
    await common.expectVisible(auth.loginFormContainer);

    await auth.fillLoginForm(user.email, user.password);
    await common.click(auth.loginSubmitButton);

    await common.expectHidden(auth.authModal);

    await common.expectVisible(flightFinder.logoutButton);

    await common.reloadPage();

    await common.expectVisible(flightFinder.logoutButton);
  });

  test("TC-LOGIN-07 | should clear invalid session after page reload", async () => {
    await auth.setInvalidAuthToken();

    await common.reloadPage();

    await common.expectHidden(flightFinder.logoutButton);

    await auth.expectAuthTokenRemoved();
  });
});
