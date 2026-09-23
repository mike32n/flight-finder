import { test } from "@playwright/test";
import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import MainPage from "../pages/main.page";
import AuthPage from "../pages/auth.page";
import { createTestUser, createVerifiedTestUser } from "../helpers/user.helper";

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { createUser, verifyUser } = require("../../models/userModel");

test.describe("Authentication - Login", () => {
  let common: CommonPage;
  let main: MainPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    main = new MainPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("should login an existing user successfully", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(verifiedUser.email, verifiedUser.password);
    await auth.submitLoginForm();
    await auth.expectAuthModalHidden();

    await common.expectVisible(main.authContainer);
    await common.expectVisible(main.logoutButton);
  });

  test("should not login with invalid password", async () => {
    const verifiedUser = await createVerifiedTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(verifiedUser.email, "WrongPassword");
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginErrorMessage("Invalid email or password.");

    await common.expectNotPresent(main.logoutButton);
  });

  test("should not login with unverified user", async () => {
    const user = await createTestUser();

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(user.email, user.password);
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginErrorMessage(
      "Please verify your email before logging in.",
    );

    await common.expectNotPresent(main.logoutButton);
  });

  test("should not login with non-existent user", async () => {
    const email = `non-existent-${Date.now()}@example.com`;

    await auth.clickLoginButton();
    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(email, "SomePassword1");
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginErrorMessage("Invalid email or password.");

    await common.expectNotPresent(main.logoutButton);
  });
});
