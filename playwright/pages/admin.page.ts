import { Locator, Page, expect } from "@playwright/test";

type PlanName = "anonymous" | "registered" | "premium";

export default class AdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly status: Locator;
  readonly content: Locator;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly policyRows: Locator;

  private requestCount = 0;
  private authorizationHeader: string | undefined;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", {
      name: "Administration",
      exact: true,
    });

    this.status = page.locator("#admin-status");
    this.content = page.locator("#admin-content");
    this.table = page.locator("#plan-policies-table");
    this.columnHeaders = this.table.locator("thead th");
    this.policyRows = this.table.locator("tbody tr");
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

  getPolicyCell(setting: string, plan: PlanName): Locator {
    const column = {
      anonymous: 0,
      registered: 1,
      premium: 2,
    }[plan];

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

  async expectRequestCount(count: number): Promise<void> {
    await expect.poll(() => this.requestCount).toBe(count);
  }

  async expectAuthorizationHeader(value: string): Promise<void> {
    expect(this.authorizationHeader).toBe(value);
  }
}
