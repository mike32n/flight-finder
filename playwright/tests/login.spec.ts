import { test } from "@playwright/test";
import Env from "../utils/env";
import MainPage from "../pages/main.page";
import AuthPage from "../pages/auth.page";

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { createUser, verifyUser } = require("../../models/userModel");

test.describe("Authentication - Login", () => {
  let main: MainPage;
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    main = new MainPage(page);
    auth = new AuthPage(page);

    await page.goto(Env.test);
  });

  test("should login an existing user successfully", async () => {
    const email = `e2e-login-${Date.now()}@example.com`;
    const password = "TestPassword1";
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    const user = await createUser({ email, passwordHash, verificationToken });

    await verifyUser(user.id);

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(email, password);
    await auth.submitLoginForm();
    await auth.expectAuthModalHidden();

    await main.expectVisible(main.authContainer);
    await main.expectVisible(main.logoutButton);
  });

  test("should not login with invalid password", async () => {
    const email = `e2e-login-${Date.now()}@example.com`;
    const password = "TestPassword1";
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    const user = await createUser({ email, passwordHash, verificationToken });

    await verifyUser(user.id);

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(email, "WrongPassword");
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginErrorMessage("Invalid email or password.");

    await main.expectNotPresent(main.logoutButton);
  });

  test("should not login with unverified user", async () => {
    const email = `e2e-login-${Date.now()}@example.com`;
    const password = "TestPassword1";
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    await createUser({ email, passwordHash, verificationToken });

    await auth.clickLoginButton();

    await auth.expectAuthModalVisible();
    await auth.expectLoginFormVisible();

    await auth.fillLoginForm(email, password);
    await auth.submitLoginForm();
    await auth.expectAuthModalVisible();
    await auth.expectLoginErrorMessage(
      "Please verify your email before logging in.",
    );

    await main.expectNotPresent(main.logoutButton);
  });
});
