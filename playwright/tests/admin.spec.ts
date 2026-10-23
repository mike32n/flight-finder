import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AuthPage from "../pages/auth.page";
import AdminPage from "../pages/admin.page";

const planDefaults = require("../../config/planDefaults");

test.describe("Administration", () => {
  let common: CommonPage;
  let auth: AuthPage;
  let admin: AdminPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    auth = new AuthPage(page);
    admin = new AdminPage(page);
  });

  test("TC-ADMIN-01 | should redirect to search without calling the admin API when signed out", async () => {
    await admin.mockPoliciesResponse(200, {});

    await common.openPage(`${Env.test}admin.html`);

    await common.expectURL(Env.test);
    await common.expectVisible(auth.loginButton);
    await common.expectHidden(admin.content);

    await admin.expectRequestCount(0);
  });

  test("TC-ADMIN-02 | should display all plan policies using an authenticated request", async () => {
    await admin.setAuthToken();

    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });

    await common.openPage(`${Env.test}admin.html`);

    await common.expectVisible(admin.heading);
    await common.expectVisible(admin.content);
    await common.expectHidden(admin.status);

    await common.expectText(admin.columnHeaders, [
      "Setting",
      "Anonymous",
      "Registered",
      "Premium",
    ]);

    await common.expectValue(
      admin.getPolicyControl("Maximum destinations", "anonymous"),
      "1",
    );

    await common.expectChecked(
      admin.getPolicyControl("Choose departure airport", "registered"),
    );

    await common.expectChecked(
      admin.getPolicyControl("Choose search start date", "premium"),
    );

    await common.expectValue(
      admin.getPolicyControl("Fixed weekday (when locked)", "anonymous"),
      "6",
    );

    await admin.expectRequestCount(1);
    await admin.expectAuthorizationHeader("Bearer admin-ui-test-token");
  });

  test("TC-ADMIN-03-401 | should clear the rejected token and redirect to search", async () => {
    await admin.setAuthToken();
    // A subsequent /me request must not hide a token-reseeding regression.
    await auth.mockCurrentUserFailure(500);
    await admin.mockPoliciesResponse(401, {
      success: false,
    });

    await common.openPage(`${Env.test}admin.html`);

    await common.expectURL(Env.test);
    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();
    await common.expectHidden(admin.content);

    await admin.expectRequestCount(1);
  });

  test("TC-ADMIN-03-403 | should deny administration without ending the session", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(403, {
      success: false,
    });

    await common.openPage(`${Env.test}admin.html`);

    await common.expectURL(`${Env.test}admin.html`);
    await common.expectText(admin.status, "Admin access required.");
    await common.expectHidden(admin.content);
    await auth.expectAuthTokenPresent();

    await admin.expectRequestCount(1);
  });

  test("TC-ADMIN-04 | should show a loading error when the server fails", async () => {
    await admin.setAuthToken();

    await admin.mockPoliciesResponse(500, {
      success: false,
    });

    await common.openPage(`${Env.test}admin.html`);

    await common.expectText(
      admin.status,
      "Plan policies could not be loaded. Please reload to try again.",
    );
    await common.expectHidden(admin.content);
  });

  test("TC-ADMIN-05 | should reject an incomplete policy response", async () => {
    await admin.setAuthToken();

    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: {},
    });

    await common.openPage(`${Env.test}admin.html`);

    await common.expectText(
      admin.status,
      "Plan policies could not be loaded. Please reload to try again.",
    );
    await common.expectHidden(admin.content);
  });

  test("TC-ADMIN-06 | should save the selected plan with numeric and boolean values", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });
    await admin.mockSaveResponse();

    await common.openPage(`${Env.test}admin.html`);
    await common.expectVisible(admin.content);

    await common.fill(
      admin.getPolicyControl("Maximum destinations", "registered"),
      "1",
    );

    await common.setChecked(
      admin.getPolicyControl("Choose search start date", "registered"),
      true,
    );

    await common.click(admin.getSaveButton("registered"));

    await common.expectText(admin.getSaveStatus("registered"), "Saved.");
    await common.expectEnabled(admin.getSaveButton("registered"));

    await admin.expectSavedPolicy("registered", {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectStartDate: true,
    });

    await admin.expectSaveRequestCount(1);
  });

  test("TC-ADMIN-07 | should retain edited values after a validation error", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });

    const message = "Invalid policy for registered: Invalid maxDestinations";

    await admin.mockSaveResponse(400, {
      success: false,
      message,
    });

    await common.openPage(`${Env.test}admin.html`);
    await common.expectVisible(admin.content);

    await common.fill(
      admin.getPolicyControl("Maximum destinations", "registered"),
      "999",
    );

    await common.click(admin.getSaveButton("registered"));

    await common.expectText(admin.getSaveStatus("registered"), message);

    await common.expectValue(
      admin.getPolicyControl("Maximum destinations", "registered"),
      "999",
    );

    await common.expectEnabled(admin.getSaveButton("registered"));
  });

  test("TC-ADMIN-08 | should hide configuration when admin access is revoked before saving", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });
    await admin.mockSaveResponse(403, {
      success: false,
      message: "Admin access required.",
    });

    await common.openPage(`${Env.test}admin.html`);
    await common.expectVisible(admin.content);

    await common.click(admin.getSaveButton("registered"));

    await common.expectText(admin.status, "Admin access required.");
    await common.expectHidden(admin.content);
  });

  test("TC-ADMIN-09 | should allow retry after a save failure", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });
    await admin.mockSaveResponse(500, {
      success: false,
    });

    await common.openPage(`${Env.test}admin.html`);
    await common.expectVisible(admin.content);

    await common.click(admin.getSaveButton("premium"));

    await common.expectText(
      admin.getSaveStatus("premium"),
      "Changes could not be saved. Please try again.",
    );
    await common.expectEnabled(admin.getSaveButton("premium"));

    await admin.mockSaveResponse();
    await common.click(admin.getSaveButton("premium"));

    await common.expectText(admin.getSaveStatus("premium"), "Saved.");
    await admin.expectSaveRequestCount(2);
  });

  test("TC-ADMIN-10 | should redirect when the session expires before saving", async () => {
    await admin.setAuthToken();
    await admin.mockPoliciesResponse(200, {
      success: true,
      policies: planDefaults,
    });

    await admin.mockSaveResponse(401, {
      success: false,
      message: "Invalid or expired authentication token.",
    });

    await common.openPage(`${Env.test}admin.html`);
    await common.expectVisible(admin.content);

    await common.click(admin.getSaveButton("registered"));

    await common.expectURL(Env.test);
    await common.expectVisible(auth.loginButton);
    await auth.expectAuthTokenRemoved();

    await admin.expectSaveRequestCount(1);
  });
});
