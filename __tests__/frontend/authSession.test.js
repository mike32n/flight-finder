const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createBrowser() {
  const elements = new Map();
  const children = [];

  function createElement(id = "") {
    return {
      id,
      value: "",
      hidden: true,
      disabled: false,
      checked: false,
      innerHTML: "",
      textContent: "",
      className: "",
      dataset: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
      validity: { badInput: false },
      addEventListener: jest.fn(),
      remove: jest.fn(function () {
        const index = children.indexOf(this);
        if (index !== -1) children.splice(index, 1);
        if (elements.get(this.id) === this) elements.delete(this.id);
      }),
      setAttribute: jest.fn(),
      querySelector: () => null,
      querySelectorAll: () => [],
    };
  }

  const selectedContainer = createElement("selected-container");
  selectedContainer.querySelector = (selector) =>
    selector === ".error-card"
      ? children.find((element) => element.className.includes("error-card")) ??
        null
      : null;
  selectedContainer.appendChild = (element) => {
    element.parentElement = selectedContainer;
    children.push(element);
    elements.set(element.id, element);
  };
  elements.set("selected-container", selectedContainer);

  const context = vm.createContext({
    AbortController,
    Event,
    URL,
    console: {
      error: jest.fn(),
      warn: jest.fn(),
    },
    fetch: jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          email: "session@example.com",
          plan: "registered",
          smartFlexPreference: true,
        },
      }),
    }),
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    window: {
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    },
    document: {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, createElement(id));
        }

        return elements.get(id);
      },
      createElement: () => createElement(),
      querySelectorAll: () => [],
    },
  });

  for (const file of ["booking-url.js", "auth.js", "app.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "../../public/js", file),
      "utf8",
    );

    vm.runInContext(source, context, { filename: file });
  }

  return {
    context,
    run: (code) => vm.runInContext(code, context),
  };
}

function expectPreference(context, checked) {
  const checkbox = context.document.getElementById("smart-flex-preference");
  expect(checkbox.checked).toBe(checked);
  expect(checkbox.disabled).toBe(true);
}

describe("frontend session handling", () => {
  test.each([
    ["registered", true],
    ["registered", false],
    ["premium", true],
    ["premium", false],
  ])("loads the %s user's preference %s", async (plan, preference) => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 42, plan, smartFlexPreference: preference },
      }),
    });

    await expect(
      run('saveToken("valid-token"); loadCurrentUser()'),
    ).resolves.toBe("authenticated");

    expectPreference(context, preference);
  });

  test.each([
    ["missing preference", "registered", undefined],
    ["null preference", "registered", null],
    ["numeric preference", "registered", 1],
    ["string preference", "premium", "true"],
    ["invalid plan", "anonymous", true],
    ["missing plan", undefined, true],
  ])("leaves the preference off for %s", async (_, plan, preference) => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 42, plan, smartFlexPreference: preference },
      }),
    });

    await expect(
      run('saveToken("valid-token"); loadCurrentUser()'),
    ).resolves.toBe("authenticated");

    expectPreference(context, false);
    expect(context.console.error).toHaveBeenCalledWith(
      "Invalid Smart Flex preference or plan for current user.",
    );
  });

  test("keeps the guest preference off without requesting a user", async () => {
    const { context, run } = createBrowser();
    const checkbox = context.document.getElementById("smart-flex-preference");
    checkbox.checked = true;
    checkbox.disabled = false;

    await expect(run("loadCurrentUser()")).resolves.toBe("anonymous");

    expectPreference(context, false);
    expect(context.fetch).not.toHaveBeenCalled();
  });

  test("clears the preference while verifying and after a failed request", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    expectPreference(context, true);

    let resolveRequest;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );

    const pending = run("loadCurrentUser()");
    expectPreference(context, false);

    resolveRequest({ ok: false, status: 500 });
    await expect(pending).resolves.toBe("unavailable");
    expectPreference(context, false);
    expect(context.console.error).toHaveBeenCalled();
  });

  test("clears the preference when verification is invalidated or the user logs out", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    expectPreference(context, true);

    run("invalidateCurrentUserVerification()");
    expectPreference(context, false);

    await run("loadCurrentUser()");
    expectPreference(context, true);
    run("logout()");
    expectPreference(context, false);
  });

  test.each([
    ["current user", "loadCurrentUser()"],
    ["search access", "refreshSearchAccess()"],
    ["search stream", "search()"],
  ])("clears the expired session after %s returns 401", async (_, action) => {
    const { context, run } = createBrowser();

    await run('saveToken("expired-token"); loadCurrentUser()');
    expectPreference(context, true);

    run(`
      destinationsData = [{ value: "AMS", label: "Amsterdam" }];
      selectedDestinations = ["AMS"];
      searchAccess = { policy: { canSelectStartDate: true } };
      searchAccessLoading = false;
      searchOwnerUserId = 42;

      sessionStorage.setItem(
        SEARCH_STATE_KEY,
        JSON.stringify({ ownerUserId: 42 })
      );

      document.getElementById("start-date").value = getTodayDate();
      document.getElementById("results").innerHTML = "Private results";
    `);

    context.fetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await run(action);

    expect(run("getToken()")).toBeNull();
    expect(run("authUser")).toBeNull();
    expectPreference(context, false);
    expect(run("sessionStorage.getItem(SEARCH_STATE_KEY)")).toBeNull();
    expect(context.document.getElementById("results").innerHTML).toBe("");
    const expirationMessage = context.document.getElementById(
      "search-validation-error",
    );
    expect(expirationMessage.textContent).toBe(
      "⚠️ Your session has expired. Please sign in again.",
    );
    expect(expirationMessage.className).toContain("error-card");
    expect(context.document.getElementById("admin-link").hidden).toBe(true);

    if (action !== "loadCurrentUser()") {
      expect(context.window.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(context.window.dispatchEvent.mock.calls[0][0].type).toBe(
        "auth-changed",
      );
    }
  });

  test.each([200, 401])(
    "ignores a stale current-user response with status %i",
    async (status) => {
      const { context, run } = createBrowser();

      run('saveToken("old-token")');

      let resolveRequest;

      context.fetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
      );

      const pendingVerification = run("loadCurrentUser()");

      run('endSession(); saveToken("new-token")');

      resolveRequest({
        ok: status === 200,
        status,
        json: async () => ({
          user: { id: 42, email: "old@example.com" },
        }),
      });

      await expect(pendingVerification).resolves.toBe("stale");

      expect(run("getToken()")).toBe("new-token");
      expect(run("authUser")).toBeNull();
      expectPreference(context, false);
      expect(
        context.document.getElementById("search-validation-error").hidden,
      ).toBe(true);
    },
  );

  test("does not apply an old response after switching accounts", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    expectPreference(context, true);

    let resolveOldRequest;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveOldRequest = resolve)),
    );
    const oldRequest = run("loadCurrentUser()");
    run('saveToken("new-token")');
    expectPreference(context, false);

    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 43, plan: "registered", smartFlexPreference: false },
      }),
    });
    await run("loadCurrentUser()");

    resolveOldRequest({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 42, plan: "registered", smartFlexPreference: true },
      }),
    });
    await expect(oldRequest).resolves.toBe("stale");
    expect(run("authUser.id")).toBe(43);
    expectPreference(context, false);
  });

  test("resets immediately when another tab changes the token", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    expectPreference(context, true);
    context.location = { hash: "" };
    context.localStorage.setItem("authToken", "new-token");

    const storageHandler = context.window.addEventListener.mock.calls.find(
      ([type]) => type === "storage",
    )[1];
    const refresh = storageHandler({
      storageArea: context.localStorage,
      key: "authToken",
    });
    expectPreference(context, false);
    await refresh;
    expect(run("isCurrentUserVerified()")).toBe(false);
  });

  test("refreshes the preference through admin revalidation", async () => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 42, plan: "registered", smartFlexPreference: false },
      }),
    });
    await run('saveToken("valid-token"); loadCurrentUser()');
    expectPreference(context, false);

    context.location = { hash: "#admin" };
    context.document.getElementById("admin-link").querySelector = () => ({
      textContent: "",
    });
    context.window.initializeAdminView = jest.fn().mockResolvedValue(true);
    let resolveRequest;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );

    const pending = run("activateAdminView({ updateHistory: false })");
    expectPreference(context, false);
    resolveRequest({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          isAdmin: true,
          smartFlexPreference: true,
        },
      }),
    });
    await pending;

    expectPreference(context, true);
    expect(context.window.initializeAdminView).toHaveBeenCalledTimes(1);
  });

  test("retains the token but blocks search after verification returns 500", async () => {
    const { context, run } = createBrowser();

    await run('saveToken("valid-token"); loadCurrentUser()');

    run(`
      searchAccess = { policy: {} };
      searchAccessLoading = false;
    `);

    expect(run("isSearchAccessReady()")).toBe(true);

    context.fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(run("loadCurrentUser()")).resolves.toBe("unavailable");

    expect(run("getToken()")).toBe("valid-token");
    expect(run("isSearchAccessReady()")).toBe(false);
  });
});
