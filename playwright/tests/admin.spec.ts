import { test } from "@playwright/test";

import Env from "../utils/env";
import CommonPage from "../pages/common.page";
import AdminPage from "../pages/admin.page";

const planDefaults = require("../../config/planDefaults");

test.describe("Administration", () => {
  let common: CommonPage;
  let admin: AdminPage;

  test.beforeEach(async ({ page }) => {
    common = new CommonPage(page);
    admin = new AdminPage(page);
  });

  test("TC-ADMIN-01 | should request sign-in without calling the admin API", async () => {
    await admin.mockPoliciesResponse(200, {});

    await common.openPage(`${Env.test}admin.html`);

    await common.expectText(
      admin.status,
      "Please sign in to access administration.",
    );
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

  for (const [status, message] of [
    [401, "Your session has expired. Please sign in again."],
    [403, "Admin access required."],
  ] as const) {
    test(`TC-ADMIN-03-${status} | should handle denied access`, async () => {
      await admin.setAuthToken();

      await admin.mockPoliciesResponse(status, {
        success: false,
      });

      await common.openPage(`${Env.test}admin.html`);

      await common.expectText(admin.status, message);
      await common.expectHidden(admin.content);

      await admin.expectRequestCount(1);
    });
  }

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
});
