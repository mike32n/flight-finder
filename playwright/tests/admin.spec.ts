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

    await common.expectText(
      admin.getPolicyCell("Maximum destinations", "anonymous"),
      "1",
    );

    await common.expectText(
      admin.getPolicyCell("Choose departure airport", "registered"),
      "Yes",
    );

    await common.expectText(
      admin.getPolicyCell("Choose search start date", "premium"),
      "Yes",
    );

    await common.expectText(
      admin.getPolicyCell("Fixed weekday (when locked)", "anonymous"),
      "Saturday",
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
});
