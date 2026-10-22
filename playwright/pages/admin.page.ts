import { Locator, Page, expect } from "@playwright/test";

type PlanName = "anonymous" | "registered" | "premium";

const planColumns: Record<PlanName, number> = {
  anonymous: 0,
  registered: 1,
  premium: 2,
};

export default class AdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly status: Locator;
  readonly content: Locator;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly policyRows: Locator;
  readonly saveButtons: Locator;
  readonly saveStatuses: Locator;

  private requestCount = 0;
  private saveRequestCount = 0;
  private authorizationHeader: string | undefined;
  private lastSaveRequest:
    | {
        plan: string | undefined;
        policy: unknown;
        authorization: string | undefined;
      }
    | undefined;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { level: 1 });

    this.status = page.locator("#admin-status");
    this.content = page.locator("#admin-content");
    this.table = page.locator("#plan-policies-table");
    this.columnHeaders = this.table.locator("thead th");
    this.policyRows = this.table.locator("tbody tr");
    this.saveButtons = this.table.locator('tfoot button[type="submit"]');
    this.saveStatuses = this.table.locator(".policy-save-status");
  }

  async setAuthToken(token = "admin-ui-test-token"): Promise<void> {
    await this.page.addInitScript((value) => {
      localStorage.setItem("authToken", value);
    }, token);
  }

  async mockPoliciesResponse(status: number, body: unknown): Promise<void> {
    await this.page.route("**/api/admin/plan-policies", async (route) => {
      this.requestCount++;
      this.authorizationHeader = route.request().headers().authorization;

      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
  }

  async mockSaveResponse(status = 200, body?: unknown): Promise<void> {
    await this.page.route("**/api/admin/plan-policies/*", async (route) => {
      const plan = new URL(route.request().url()).pathname.split("/").pop();

      const policy = route.request().postDataJSON();

      this.saveRequestCount++;
      this.lastSaveRequest = {
        plan,
        policy,
        authorization: route.request().headers().authorization,
      };

      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          body === undefined ? { success: true, plan, policy } : body,
        ),
      });
    });
  }

  getPolicyCell(setting: string, plan: PlanName): Locator {
    const column = planColumns[plan];

    return this.policyRows
      .filter({
        has: this.page.getByRole("rowheader", {
          name: setting,
          exact: true,
        }),
      })
      .getByRole("cell")
      .nth(column);
  }

  getPolicyControl(setting: string, plan: PlanName): Locator {
    return this.getPolicyCell(setting, plan).locator("input, select");
  }

  getSaveButton(plan: PlanName): Locator {
    return this.saveButtons.nth(planColumns[plan]);
  }

  getSaveStatus(plan: PlanName): Locator {
    return this.saveStatuses.nth(planColumns[plan]);
  }

  async expectRequestCount(count: number): Promise<void> {
    await expect.poll(() => this.requestCount).toBe(count);
  }

  async expectAuthorizationHeader(value: string): Promise<void> {
    expect(this.authorizationHeader).toBe(value);
  }

  async expectSavedPolicy(
    plan: PlanName,
    policy: unknown,
    token = "admin-ui-test-token",
  ): Promise<void> {
    expect(this.lastSaveRequest).toEqual({
      plan,
      policy,
      authorization: `Bearer ${token}`,
    });
  }

  async expectSaveRequestCount(count: number): Promise<void> {
    await expect.poll(() => this.saveRequestCount).toBe(count);
  }
}
