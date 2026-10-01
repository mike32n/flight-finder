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

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { createUser, verifyUser } = require("../../models/userModel");

test.describe("Authentication - Login", () => {
  let common: CommonPage;
  let flightFinder: FlightFinderPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    flightFinder = new FlightFinderPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("TC-LOGIN-01 | should login an existing user successfully", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await auth.submitLoginForm();
    await auth.expectAuthModalHidden();

    await common.expectVisible(flightFinder.logoutButton);
  });

  test("TC-LOGIN-02 | should not login with invalid password", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(verifiedUser.email, "WrongPassword");
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginMessage("Invalid email or password.");

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-03 | should not login with unverified user", async () => {
    const user = await createTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginMessage(
      "Please verify your email before logging in.",
    );

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-04 | should not login with non-existent user", async () => {
    const email = createUniqueTestEmail("e2e-nonexistent");

    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(email, "SomePassword1");
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginMessage("Invalid email or password.");

    await common.expectNotPresent(flightFinder.logoutButton);
  });

  test("TC-LOGIN-05 | should logout successfully", async () => {
    const user = await createTestUser();
    await verifyUser(user.userId);

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();

    await auth.expectAuthModalHidden();

    await common.expectVisible(flightFinder.logoutButton);

    await flightFinder.clickLogoutButton();

    await common.expectHidden(flightFinder.logoutButton);

    await auth.expectAuthTokenRemoved();
  });

  test("TC-LOGIN-06 | should restore authenticated session after page reload", async () => {
    const user = await createTestUser();

    await verifyUser(user.userId);

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();

    await auth.expectAuthModalHidden();

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
