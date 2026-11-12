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
    setTimeout,
    clearTimeout,
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
          smartFlexPreferenceVersion: 0,
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

function expectPreference(context, checked, disabled = true) {
  const checkbox = context.document.getElementById("smart-flex-preference");
  expect(checkbox.checked).toBe(checked);
  expect(checkbox.disabled).toBe(disabled);
}

function changePreference(context, checked) {
  const checkbox = context.document.getElementById("smart-flex-preference");
  checkbox.checked = checked;
  const handler = checkbox.addEventListener.mock.calls.find(
    ([event]) => event === "change",
  )[1];
  return handler();
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function expectRecoveryStarted(recoveryStarted, failedLogin) {
  const result = await Promise.race([
    recoveryStarted.promise.then((request) => ({
      event: "recovery GET started",
      request,
    })),
    failedLogin.then(() => ({
      event: "login completed without starting recovery GET",
    })),
  ]);
  expect(result.event).toBe("recovery GET started");
  return result.request;
}

function currentUserResponse(id, preference, version = 0) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      user: {
        id,
        email: `user${id}@example.com`,
        plan: "registered",
        smartFlexPreference: preference,
        smartFlexPreferenceVersion: version,
      },
    }),
  };
}

function loginResponse(token) {
  return { ok: true, status: 200, json: async () => ({ token }) };
}

function rejectedLoginResponse() {
  return {
    ok: false,
    status: 401,
    json: async () => ({ message: "Invalid credentials" }),
  };
}

function setupLogin(browser) {
  const { context, run } = browser;
  const form = context.document.getElementById("login-form");
  const button = context.document.getElementById("login-submit");
  button.textContent = "Login";
  form.querySelector = () => button;
  for (const id of ["login-form", "register-form", "forgot-form"]) {
    context.document.getElementById(id).reset = jest.fn();
  }
  context.document.getElementById("login-message").classList.toggle = jest.fn();
  context.document.getElementById("auth-container").querySelector = () => ({});
  context.location = { hash: "" };
  run("searchPageInitialized = true; refreshSearchAccess = async () => {}");

  const submitHandler = form.addEventListener.mock.calls.find(
    ([event]) => event === "submit",
  )[1];
  const storageHandler = context.window.addEventListener.mock.calls.find(
    ([event]) => event === "storage",
  )[1];

  return {
    button,
    submit: () => submitHandler({ preventDefault: jest.fn(), target: form }),
    async switchAccount(token, id, preference) {
      context.localStorage.setItem("authToken", token);
      context.fetch.mockResolvedValueOnce(currentUserResponse(id, preference));
      await storageHandler({
        storageArea: context.localStorage,
        key: "authToken",
      });
    },
  };
}

async function beginInterruptedLogin(browser, login) {
  const oldVerification = deferred();
  const verificationStarted = deferred();
  browser.context.fetch
    .mockResolvedValueOnce(loginResponse("token-A"))
    .mockImplementationOnce(() => {
      verificationStarted.resolve();
      return oldVerification.promise;
    });

  const firstLogin = login.submit();
  await verificationStarted.promise;
  return { firstLogin, oldVerification };
}

async function beginLoginRecovery(browser, login) {
  const interrupted = await beginInterruptedLogin(browser, login);
  const recovery = deferred();
  const recoveryStarted = deferred();
  browser.context.fetch
    .mockResolvedValueOnce(rejectedLoginResponse())
    .mockImplementationOnce((url, options) => {
      recoveryStarted.resolve({ url, options });
      return recovery.promise;
    });
  const failedLogin = login.submit();
  const request = await expectRecoveryStarted(recoveryStarted, failedLogin);
  expect(request.url).toBe("/api/auth/me");
  expect(request.options.headers.Authorization).toBe("Bearer token-A");
  return { ...interrupted, recovery, failedLogin };
}

describe("frontend session handling", () => {
  describe("destination placeholder", () => {
    test.each([
      ["anonymous", 1],
      ["registered", 3],
      ["premium", 3],
    ])("updates after selection and removal for %s", (plan, limit) => {
      const { context, run } = createBrowser();
      const input = context.document.getElementById("destination-input");
      const origin = context.document.getElementById("origin-input");
      origin.placeholder = "Type city or IATA code...";
      const container = context.document.getElementById("selected-container");
      const append = jest.spyOn(container, "appendChild");

      run(`
        searchAccess = { plan: "${plan}", policy: {} };
        searchAccessLoading = false;
        maxDestinations = ${limit};
        destinationsData = [{ value: "AMS" }, { value: "BCN" }, { value: "LCA" }];
        document.getElementById("origin").value = "BUD";
        updateSearchControls();
      `);
      expect(input.placeholder).toBe(`Type city or IATA code (${limit} left)`);

      const codes = ["AMS", "BCN", "LCA"].slice(0, limit);
      codes.forEach((code, index) => {
        run(`selectDestination({ value: "${code}" })`);
        const remaining = limit - index - 1;
        expect(input.placeholder).toBe(
          remaining
            ? `Type city or IATA code (${remaining} left)`
            : "Max selected",
        );
      });

      const firstBadge = append.mock.calls
        .map(([element]) => element)
        .filter((element) => element.textContent === "AMS")
        .pop();
      const click = firstBadge.addEventListener.mock.calls.find(
        ([event]) => event === "click",
      )[1];
      click();
      expect(input.placeholder).toBe("Type city or IATA code (1 left)");
      expect(origin.placeholder).toBe("Type city or IATA code...");
    });

    test("restores the static placeholder during refresh and applies the new limit", async () => {
      const { context, run } = createBrowser();
      const input = context.document.getElementById("destination-input");
      const response = deferred();
      context.fetch.mockImplementationOnce(() => response.promise);
      run(`
        searchAccess = { plan: "premium", policy: {} };
        searchAccessLoading = false;
        selectedDestinations = ["AMS"];
        maxDestinations = 3;
        document.getElementById("origin").value = "BUD";
        updateSearchControls();
      `);
      expect(input.placeholder).toBe("Type city or IATA code (2 left)");

      const pending = run("refreshSearchAccess()");
      expect(context.fetch).toHaveBeenCalledTimes(1);
      expect(input.placeholder).toBe("Type city or IATA code...");
      response.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          plan: "premium",
          policy: {
            canSelectOrigin: true,
            canSelectWeekday: true,
            canSelectNights: true,
            canSelectStartDate: true,
            smartFlexEnabled: true,
            maxDestinations: 2,
            fixedWeekday: 6,
            fixedNights: 1,
          },
        }),
      });
      await pending;
      expect(input.placeholder).toBe("Type city or IATA code (1 left)");

      run('setSearchAccessUnavailable("Search settings unavailable")');
      expect(input.placeholder).toBe("Type city or IATA code...");
    });

    test("clamps remaining destinations to zero", () => {
      const { context, run } = createBrowser();
      run(`
        searchAccess = { plan: "registered", policy: {} };
        searchAccessLoading = false;
        maxDestinations = 1;
        selectedDestinations = ["AMS", "BCN"];
        updateSearchControls();
      `);
      expect(context.document.getElementById("destination-input").placeholder)
        .toBe("Max selected");
    });
  });

  describe("login freshness", () => {
    test.each([
      ["successful", "response"],
      ["successful", "body"],
      ["failed", "response"],
      ["failed", "body"],
    ])(
      "ignores a delayed %s login %s after a cross-tab account change",
      async (outcome, stage) => {
        const browser = createBrowser();
        const { context, run } = browser;
        const login = setupLogin(browser);
        const delayed = deferred();
        const bodyStarted = deferred();
        const ok = outcome === "successful";
        const data = ok ? { token: "token-A" } : { message: "Old login error" };

        if (stage === "response") {
          context.fetch.mockImplementationOnce(() => delayed.promise);
        } else {
          context.fetch.mockResolvedValueOnce({
            ok,
            status: ok ? 200 : 401,
            json: () => {
              bodyStarted.resolve();
              return delayed.promise;
            },
          });
        }

        const oldLogin = login.submit();
        expect(login.button.disabled).toBe(true);
        if (stage === "body") await bodyStarted.promise;

        await login.switchAccount("token-B", 43, false);
        expect(login.button.disabled).toBe(false);
        expect(run("getToken()")).toBe("token-B");
        expect(run("authUser.id")).toBe(43);
        expectPreference(context, false, false);
        const feedback = context.document.getElementById("login-message");
        feedback.textContent = "Current session feedback";
        const container = context.document.getElementById("auth-container");
        const currentUI = container.innerHTML;

        if (stage === "response") {
          delayed.resolve({ ok, status: ok ? 200 : 401, json: async () => data });
        } else {
          delayed.resolve(data);
        }
        await oldLogin;

        expect(run("getToken()")).toBe("token-B");
        expect(run("authUser.id")).toBe(43);
        expect(run("isCurrentUserVerified()")).toBe(true);
        expectPreference(context, false, false);
        expect(context.document.getElementById("auth-user-email").textContent)
          .toBe("user43@example.com");
        expect(container.innerHTML).toBe(currentUI);
        expect(feedback.textContent).toBe("Current session feedback");
        expect(context.document.getElementById("auth-modal").classList.add)
          .not.toHaveBeenCalledWith("hidden");
        expect(context.window.dispatchEvent).not.toHaveBeenCalled();
        expect(login.button.disabled).toBe(false);
      },
    );

    test("ignores a successful login response after logout", async () => {
      const browser = createBrowser();
      const { context, run } = browser;
      const login = setupLogin(browser);
      context.fetch.mockResolvedValueOnce(currentUserResponse(42, true));
      await run('saveToken("token-A"); loadCurrentUser()');
      run("renderAuthUI()");
      const response = deferred();
      context.fetch.mockImplementationOnce(() => response.promise);
      const pendingLogin = login.submit();
      expect(login.button.disabled).toBe(true);

      run("logout()");
      const feedback = context.document.getElementById("login-message");
      feedback.textContent = "Current session feedback";
      const dispatchCount = context.window.dispatchEvent.mock.calls.length;
      expect(login.button.disabled).toBe(false);
      response.resolve(loginResponse("token-B"));
      await pendingLogin;

      expect(run("getToken()")).toBeNull();
      expect(run("authUser")).toBeNull();
      expectPreference(context, false);
      expect(context.document.getElementById("auth-container").innerHTML)
        .toContain('id="login-btn"');
      expect(feedback.textContent).toBe("Current session feedback");
      expect(context.window.dispatchEvent).toHaveBeenCalledTimes(dispatchCount);
      expect(context.fetch).toHaveBeenCalledTimes(2);
      expect(login.button.disabled).toBe(false);
    });

    test("ignores an older login after a newer login succeeds", async () => {
      const browser = createBrowser();
      const { context, run } = browser;
      const login = setupLogin(browser);
      const firstResponse = deferred();
      const secondResponse = deferred();
      context.fetch
        .mockImplementationOnce(() => firstResponse.promise)
        .mockImplementationOnce(() => secondResponse.promise)
        .mockResolvedValueOnce(currentUserResponse(43, false));

      const firstLogin = login.submit();
      const secondLogin = login.submit();
      secondResponse.resolve(loginResponse("token-B"));
      await secondLogin;

      expect(run("getToken()")).toBe("token-B");
      expect(run("authUser.id")).toBe(43);
      expectPreference(context, false, false);
      expect(login.button.disabled).toBe(false);
      const feedback = context.document.getElementById("login-message");
      feedback.textContent = "Current session feedback";
      const dispatchCount = context.window.dispatchEvent.mock.calls.length;
      const modalCloseCount = context.document.getElementById("auth-modal")
        .classList.add.mock.calls.length;

      firstResponse.resolve(loginResponse("token-A"));
      await firstLogin;

      expect(run("getToken()")).toBe("token-B");
      expect(run("authUser.id")).toBe(43);
      expectPreference(context, false, false);
      expect(context.document.getElementById("auth-user-email").textContent)
        .toBe("user43@example.com");
      expect(feedback.textContent).toBe("Current session feedback");
      expect(context.window.dispatchEvent).toHaveBeenCalledTimes(dispatchCount);
      expect(context.document.getElementById("auth-modal").classList.add)
        .toHaveBeenCalledTimes(modalCloseCount);
      expect(login.button.disabled).toBe(false);
    });

    test.each([
      [
        "HTTP rejection",
        () => Promise.resolve(rejectedLoginResponse()),
        "Invalid credentials",
      ],
      [
        "network failure",
        () => Promise.reject(new Error("network failure")),
        "Login failed.",
      ],
      [
        "invalid response body",
        () => Promise.resolve({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("invalid JSON");
          },
        }),
        "Login failed.",
      ],
    ])(
      "revalidates the interrupted session after %s",
      async (_, failedResponse, expectedError) => {
        const browser = createBrowser();
        const { context, run } = browser;
        const login = setupLogin(browser);
        const { firstLogin, oldVerification } = await beginInterruptedLogin(
          browser,
          login,
        );
        const recovery = deferred();
        const recoveryStarted = deferred();
        context.fetch
          .mockImplementationOnce(failedResponse)
          .mockImplementationOnce((url, options) => {
            recoveryStarted.resolve({ url, options });
            return recovery.promise;
          });

        const failedLogin = login.submit();
        const request = await expectRecoveryStarted(recoveryStarted, failedLogin);
        expect(request.url).toBe("/api/auth/me");
        expect(request.options.headers.Authorization).toBe("Bearer token-A");
        expect(run("getToken()")).toBe("token-A");
        expect(run("isCurrentUserVerified()")).toBe(false);
        expectPreference(context, false);
        expect(login.button.disabled).toBe(false);
        expect(context.document.getElementById("login-message").textContent)
          .toBe(expectedError);

        oldVerification.resolve(currentUserResponse(42, false));
        await firstLogin;
        expect(run("authUser")).toBeNull();
        expectPreference(context, false);
        expect(context.window.dispatchEvent).not.toHaveBeenCalled();

        recovery.resolve(currentUserResponse(42, true));
        await failedLogin;
        expect(run("getToken()")).toBe("token-A");
        expect(run("authUser.id")).toBe(42);
        expect(run("isCurrentUserVerified()")).toBe(true);
        expectPreference(context, true, false);
        expect(context.document.getElementById("auth-user-email").textContent)
          .toBe("user42@example.com");
        expect(context.document.getElementById("login-message").textContent)
          .toBe(expectedError);
        expect(context.window.dispatchEvent).toHaveBeenCalledTimes(1);
        expect(context.window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({ type: "auth-changed" }),
        );
        expect(login.button.disabled).toBe(false);
      },
    );

    test.each([
      ["account change", 200],
      ["account change", 401],
      ["logout", 200],
      ["logout", 401],
    ])(
      "ignores recovery after %s with status %i",
      async (change, status) => {
        const browser = createBrowser();
        const { context, run } = browser;
        const login = setupLogin(browser);
        const { firstLogin, oldVerification, recovery, failedLogin } =
          await beginLoginRecovery(browser, login);
        expect(login.button.disabled).toBe(false);

        if (change === "account change") {
          await login.switchAccount("token-B", 43, false);
        } else {
          run("logout()");
        }
        const feedback = context.document.getElementById("login-message");
        feedback.textContent = "Current session feedback";
        const dispatchCount = context.window.dispatchEvent.mock.calls.length;

        recovery.resolve(
          status === 200 ? currentUserResponse(42, true) : { ok: false, status },
        );
        oldVerification.resolve(currentUserResponse(42, true));
        await failedLogin;
        await firstLogin;

        expect(run("getToken()")).toBe(change === "logout" ? null : "token-B");
        expect(run("authUser?.id ?? null")).toBe(change === "logout" ? null : 43);
        expectPreference(context, false, change === "logout");
        expect(feedback.textContent).toBe("Current session feedback");
        expect(context.window.dispatchEvent).toHaveBeenCalledTimes(dispatchCount);
        expect(login.button.disabled).toBe(false);
      },
    );

    test.each([200, 401])(
      "ignores recovery status %i after a newer login starts",
      async (status) => {
        const browser = createBrowser();
        const { context, run } = browser;
        const login = setupLogin(browser);
        const { firstLogin, oldVerification, recovery, failedLogin } =
          await beginLoginRecovery(browser, login);
        const newerResponse = deferred();
        context.fetch
          .mockImplementationOnce(() => newerResponse.promise)
          .mockResolvedValueOnce(currentUserResponse(43, false));
        const newerLogin = login.submit();
        expect(login.button.disabled).toBe(true);

        recovery.resolve(
          status === 200 ? currentUserResponse(42, true) : { ok: false, status },
        );
        oldVerification.resolve(currentUserResponse(42, true));
        await failedLogin;
        await firstLogin;

        expect(run("getToken()")).toBe("token-A");
        expect(run("authUser")).toBeNull();
        expectPreference(context, false);
        expect(context.window.dispatchEvent).not.toHaveBeenCalled();
        expect(login.button.disabled).toBe(true);

        newerResponse.resolve(loginResponse("token-B"));
        await newerLogin;
        expect(run("getToken()")).toBe("token-B");
        expect(run("authUser.id")).toBe(43);
        expectPreference(context, false, false);
        expect(context.document.getElementById("login-message").textContent)
          .toBe("");
        expect(login.button.disabled).toBe(false);
      },
    );

    test("retains the recovery requirement across overlapping login attempts", async () => {
      const browser = createBrowser();
      const { context, run } = browser;
      const login = setupLogin(browser);
      const { firstLogin, oldVerification } = await beginInterruptedLogin(
        browser,
        login,
      );
      const secondResponse = deferred();
      const thirdResponse = deferred();
      const recovery = deferred();
      const recoveryStarted = deferred();
      context.fetch
        .mockImplementationOnce(() => secondResponse.promise)
        .mockImplementationOnce(() => thirdResponse.promise)
        .mockImplementationOnce(() => {
          recoveryStarted.resolve();
          return recovery.promise;
        });

      const secondLogin = login.submit();
      const thirdLogin = login.submit();
      secondResponse.resolve(loginResponse("token-B"));
      const secondOutcome = await Promise.race([
        secondLogin.then(() => "older login completed"),
        recoveryStarted.promise.then(() => "unexpected GET before newer login failed"),
      ]);
      expect(secondOutcome).toBe("older login completed");
      expect(login.button.disabled).toBe(true);
      expect(run("getToken()")).toBe("token-A");

      thirdResponse.resolve(rejectedLoginResponse());
      await expectRecoveryStarted(recoveryStarted, thirdLogin);
      expect(login.button.disabled).toBe(false);
      oldVerification.resolve(currentUserResponse(42, false));
      await firstLogin;
      expectPreference(context, false);
      recovery.resolve(currentUserResponse(42, true));
      await thirdLogin;

      expect(run("getToken()")).toBe("token-A");
      expect(run("authUser.id")).toBe(42);
      expect(run("isCurrentUserVerified()")).toBe(true);
      expectPreference(context, true, false);
      expect(context.document.getElementById("login-message").textContent)
        .toBe("Invalid credentials");
      expect(login.button.disabled).toBe(false);
    });

    test("revalidates after a newer failed login interrupts recovery", async () => {
      const browser = createBrowser();
      const { context, run } = browser;
      const login = setupLogin(browser);
      const { firstLogin, oldVerification, recovery, failedLogin } =
        await beginLoginRecovery(browser, login);
      const newerResponse = deferred();
      const newerRecovery = deferred();
      const newerRecoveryStarted = deferred();
      context.fetch
        .mockImplementationOnce(() => newerResponse.promise)
        .mockImplementationOnce((url, options) => {
          newerRecoveryStarted.resolve({ url, options });
          return newerRecovery.promise;
        });

      const newerLogin = login.submit();
      expect(login.button.disabled).toBe(true);
      newerResponse.resolve({
        ok: false,
        status: 401,
        json: async () => ({ message: "New login failed" }),
      });
      const request = await expectRecoveryStarted(newerRecoveryStarted, newerLogin);
      expect(request.url).toBe("/api/auth/me");
      expect(request.options.headers.Authorization).toBe("Bearer token-A");
      expect(run("isCurrentUserVerified()")).toBe(false);
      expectPreference(context, false);
      expect(context.document.getElementById("login-message").textContent)
        .toBe("New login failed");
      expect(login.button.disabled).toBe(false);

      recovery.resolve(currentUserResponse(42, false));
      oldVerification.resolve(currentUserResponse(42, false));
      await failedLogin;
      await firstLogin;
      expect(run("getToken()")).toBe("token-A");
      expect(run("authUser")).toBeNull();
      expectPreference(context, false);
      expect(context.document.getElementById("login-message").textContent)
        .toBe("New login failed");
      expect(context.window.dispatchEvent).not.toHaveBeenCalled();
      expect(login.button.disabled).toBe(false);

      newerRecovery.resolve(currentUserResponse(42, true));
      await newerLogin;
      expect(run("getToken()")).toBe("token-A");
      expect(run("authUser.id")).toBe(42);
      expect(run("isCurrentUserVerified()")).toBe(true);
      expectPreference(context, true, false);
      expect(context.document.getElementById("login-message").textContent)
        .toBe("New login failed");
      expect(context.window.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(login.button.disabled).toBe(false);
    });

    test.each([401, 500])(
      "handles status %i from recovery verification",
      async (status) => {
        const browser = createBrowser();
        const { context, run } = browser;
        const login = setupLogin(browser);
        const { firstLogin, oldVerification, recovery, failedLogin } =
          await beginLoginRecovery(browser, login);
        recovery.resolve({ ok: false, status });
        await failedLogin;
        oldVerification.resolve(currentUserResponse(42, true));
        await firstLogin;

        expect(run("getToken()")).toBe(status === 401 ? null : "token-A");
        expect(run("authUser")).toBeNull();
        expectPreference(context, false);
        expect(context.document.getElementById("login-message").textContent)
          .toBe("Invalid credentials");
        if (status === 401) {
          expect(context.document.getElementById("search-validation-error").textContent)
            .toContain("session has expired");
          expect(context.window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: "auth-changed" }),
          );
        } else {
          expect(run("isCurrentUserVerified()")).toBe(false);
          expect(context.document.getElementById("search-access-status").textContent)
            .toContain("session could not be verified");
        }
        expect(login.button.disabled).toBe(false);
      },
    );

    test("completes an ordinary successful login", async () => {
      const browser = createBrowser();
      const { context, run } = browser;
      const login = setupLogin(browser);
      context.fetch
        .mockResolvedValueOnce(loginResponse("token-A"))
        .mockResolvedValueOnce(currentUserResponse(42, true));

      await login.submit();

      expect(run("getToken()")).toBe("token-A");
      expect(run("authUser.id")).toBe(42);
      expect(run("isCurrentUserVerified()")).toBe(true);
      expectPreference(context, true, false);
      expect(context.document.getElementById("auth-user-email").textContent)
        .toBe("user42@example.com");
      expect(context.document.getElementById("login-message").textContent).toBe("");
      expect(context.document.getElementById("auth-modal").classList.add)
        .toHaveBeenCalledWith("hidden");
      expect(context.window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth-changed" }),
      );
      expect(login.button.disabled).toBe(false);
    });
  });

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
        user: {
          id: 42,
          plan,
          smartFlexPreference: preference,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });

    await expect(
      run('saveToken("valid-token"); loadCurrentUser()'),
    ).resolves.toBe("authenticated");

    expectPreference(context, preference, false);
    expect(run("authUser.smartFlexPreferenceVersion")).toBe(0);
  });

  test.each([
    ["missing", undefined],
    ["negative", -1],
    ["fractional", 0.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["string", "0"],
  ])("rejects a %s Smart Flex preference version", async (_, version) => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: true,
          ...(version === undefined ? {} : { smartFlexPreferenceVersion: version }),
        },
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
        user: {
          id: 42,
          plan,
          smartFlexPreference: preference,
          smartFlexPreferenceVersion: 0,
        },
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
    expectPreference(context, true, false);

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
    expectPreference(context, true, false);

    run("invalidateCurrentUserVerification()");
    expectPreference(context, false);

    await run("loadCurrentUser()");
    expectPreference(context, true, false);
    run("logout()");
    expectPreference(context, false);
  });

  test("hides the premium badge during refresh and ignores invalidated responses", async () => {
    const { context, run } = createBrowser();
    const response = deferred();
    context.fetch.mockImplementationOnce(() => response.promise);

    run('searchAccess = { plan: "premium", policy: {} }; updateSearchControls()');
    const badge = context.document.getElementById("premium-badge");
    expect(badge.hidden).toBe(false);

    const pending = run("refreshSearchAccess()");
    expect(context.fetch).toHaveBeenCalledTimes(1);
    expect(badge.hidden).toBe(true);

    run('setSearchAccessUnavailable("Verifying your session...")');
    response.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        plan: "premium",
        policy: {
          canSelectOrigin: true,
          canSelectWeekday: true,
          canSelectNights: true,
          canSelectStartDate: true,
          smartFlexEnabled: true,
          maxDestinations: 3,
          fixedWeekday: 6,
          fixedNights: 1,
        },
      }),
    });
    await pending;

    expect(badge.hidden).toBe(true);
    expect(context.document.getElementById("search-access-status").textContent)
      .toBe("Verifying your session...");
  });

  test.each([
    ["current user", "loadCurrentUser()"],
    ["search access", "refreshSearchAccess()"],
    ["search stream", "search()"],
  ])("clears the expired session after %s returns 401", async (_, action) => {
    const { context, run } = createBrowser();

    await run('saveToken("expired-token"); loadCurrentUser()');
    expectPreference(context, true, false);

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
    expectPreference(context, true, false);

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
        user: {
          id: 43,
          plan: "registered",
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await run("loadCurrentUser()");

    resolveOldRequest({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: true,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await expect(oldRequest).resolves.toBe("stale");
    expect(run("authUser.id")).toBe(43);
    expectPreference(context, false, false);
  });

  test("resets immediately when another tab changes the token", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    expectPreference(context, true, false);
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
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await run('saveToken("valid-token"); loadCurrentUser()');
    expectPreference(context, false, false);

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
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await pending;

    expectPreference(context, true, false);
    expect(context.window.initializeAdminView).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["current user", 200],
    ["current user", 401],
    ["search access", 200],
    ["search access", 401],
  ])(
    "cancels a stalled %s refresh before opening admin and ignores its late %i response",
    async (stage, status) => {
      const { context, run } = createBrowser();
      const response = deferred();
      const started = deferred();
      let held = false;
      const userResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 42,
            email: "session@example.com",
            plan: "registered",
            isAdmin: true,
            smartFlexPreference: true,
            smartFlexPreferenceVersion: 0,
          },
        }),
      };

      context.location = { hash: "#admin" };
      context.document.getElementById("admin-link").querySelector = () => ({});
      context.document.getElementById("auth-container").querySelector = () => ({});
      context.window.initializeAdminView = jest.fn().mockResolvedValue(true);
      context.fetch.mockImplementation((url, options) => {
        const target =
          stage === "current user"
            ? "/api/auth/me"
            : "/api/search-access";
        if (url === target && !held) {
          held = true;
          started.resolve({ url, signal: options.signal });
          return response.promise;
        }
        return Promise.resolve(userResponse);
      });

      run('saveToken("valid-token"); searchPageInitialized = true');
      const pending = run("refreshSearchSession()");
      const outcome = await Promise.race([
        started.promise.then((request) => ({ event: "started", request })),
        pending.then(() => ({ event: "finished without starting request" })),
      ]);
      expect(outcome.event).toBe("started");
      expect(outcome.request.url).toBe(
        stage === "current user" ? "/api/auth/me" : "/api/search-access",
      );
      expect(outcome.request.signal.aborted).toBe(false);

      const admin = run("activateAdminView({ updateHistory: false })");
      expect(outcome.request.signal.aborted).toBe(true);
      await admin;
      expect(context.document.getElementById("admin-view").hidden).toBe(false);
      expect(context.document.getElementById("auth-container").hidden).toBe(false);
      expect(context.window.initializeAdminView).toHaveBeenCalledTimes(1);

      response.resolve({
        ok: status === 200,
        status,
        json: async () =>
          stage === "current user"
            ? {
                user: {
                  id: 99,
                  email: "stale@example.com",
                  plan: "premium",
                  isAdmin: false,
                  smartFlexPreference: false,
                  smartFlexPreferenceVersion: 0,
                },
              }
            : {
                success: true,
                plan: "premium",
                policy: {
                  canSelectOrigin: true,
                  canSelectWeekday: true,
                  canSelectNights: true,
                  canSelectStartDate: true,
                  smartFlexEnabled: true,
                  maxDestinations: 3,
                  fixedWeekday: 6,
                  fixedNights: 1,
                },
              },
      });
      await pending;

      expect(context.document.getElementById("admin-view").hidden).toBe(false);
      expect(run("getToken()")).toBe("valid-token");
      expect(run("authUser.plan")).toBe("registered");
      expect(context.document.getElementById("search-access-status").textContent)
        .toBe("Verifying your session...");
    },
  );

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

  test.each([
    ["registered", true],
    ["registered", false],
    ["premium", true],
    ["premium", false],
  ])("saves the %s user's preference as %s", async (plan, preference) => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan,
          smartFlexPreference: !preference,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await run('saveToken("valid-token"); loadCurrentUser()');
    let resolveSave;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );

    const pending = changePreference(context, preference);
    expectPreference(context, !preference);
    expect(run("authUser.smartFlexPreference")).toBe(!preference);
    expect(context.fetch).toHaveBeenLastCalledWith("/api/auth/me", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        smartFlexPreference: preference,
        expectedSmartFlexPreferenceVersion: 0,
      }),
      signal: expect.any(AbortSignal),
    });

    await changePreference(context, preference);
    expectPreference(context, !preference);
    expect(context.fetch).toHaveBeenCalledTimes(2);

    resolveSave({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: preference,
        smartFlexPreferenceVersion: 1,
      }),
    });
    await pending;
    expectPreference(context, preference, false);
    expect(run("authUser.smartFlexPreference")).toBe(preference);
  });

  test("does not save a guest preference", async () => {
    const { context, run } = createBrowser();
    await run("loadCurrentUser()");
    await changePreference(context, true);
    expectPreference(context, false);
    expect(context.fetch).not.toHaveBeenCalled();
  });

  test("restores the confirmed preference after a 400 response", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 400 });

    await changePreference(context, false);

    expectPreference(context, true, false);
    expect(run("authUser.smartFlexPreference")).toBe(true);
    expect(context.fetch).toHaveBeenCalledTimes(2);
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be saved");
    expect(context.document.getElementById("smart-flex-preference-error").hidden)
      .toBe(false);
  });

  test("expires the current session after a 401 save response", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await changePreference(context, false);

    expect(run("getToken()")).toBeNull();
    expect(run("authUser")).toBeNull();
    expectPreference(context, false);
    expect(context.document.getElementById("search-validation-error").textContent)
      .toContain("session has expired");
  });

  test("stores a successful PATCH version and uses it for the next save", async () => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValueOnce(currentUserResponse(42, true, 4));
    await run('saveToken("valid-token"); loadCurrentUser()');

    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: false,
        smartFlexPreferenceVersion: 5,
      }),
    });
    await changePreference(context, false);

    expect(run("authUser.smartFlexPreferenceVersion")).toBe(5);

    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: true,
        smartFlexPreferenceVersion: 6,
      }),
    });
    await changePreference(context, true);

    expect(context.fetch).toHaveBeenLastCalledWith("/api/auth/me", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        smartFlexPreference: true,
        expectedSmartFlexPreferenceVersion: 5,
      }),
      signal: expect.any(AbortSignal),
    });
    expect(run("authUser.smartFlexPreferenceVersion")).toBe(6);
  });

  test.each([
    ["missing", undefined],
    ["negative", -1],
    ["fractional", 1.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["wrong increment", 2],
  ])("reconciles an invalid %s PATCH version", async (_, version) => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: false,
        ...(version === undefined ? {} : { smartFlexPreferenceVersion: version }),
      }),
    });
    context.fetch.mockResolvedValueOnce(currentUserResponse(42, true, 0));

    await changePreference(context, false);

    expect(context.fetch).toHaveBeenCalledTimes(3);
    expect(run("authUser.smartFlexPreference")).toBe(true);
    expect(run("authUser.smartFlexPreferenceVersion")).toBe(0);
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be confirmed");
  });

  test("reconciles a conflict once without retrying the PATCH", async () => {
    const { context, run } = createBrowser();
    context.fetch.mockResolvedValueOnce(currentUserResponse(42, true, 3));
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 409 });
    context.fetch.mockResolvedValueOnce(currentUserResponse(42, false, 4));

    await changePreference(context, false);

    expect(context.fetch).toHaveBeenCalledTimes(3);
    expect(context.fetch.mock.calls.filter(([url, options]) =>
      url === "/api/auth/me" && options.method === "PATCH",
    )).toHaveLength(1);
    expect(run("authUser.smartFlexPreference")).toBe(false);
    expect(run("authUser.smartFlexPreferenceVersion")).toBe(4);
    expectPreference(context, false, false);
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be saved");
  });

  test("keeps safe session behavior when conflict reconciliation fails", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 409 });
    context.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await changePreference(context, false);

    expect(context.fetch).toHaveBeenCalledTimes(3);
    expect(run("getToken()")).toBe("valid-token");
    expect(run("isCurrentUserVerified()")).toBe(false);
    expectPreference(context, false);
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be saved");
  });

  test("ignores a stale conflict response after switching sessions", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    const conflictStarted = deferred();
    const conflictResponse = deferred();
    context.fetch.mockImplementationOnce(() => {
      conflictStarted.resolve();
      return conflictResponse.promise;
    });

    const save = changePreference(context, false);
    await conflictStarted.promise;
    run('endSession(); saveToken("new-token")');
    context.fetch.mockResolvedValueOnce(currentUserResponse(43, true, 7));
    await run("loadCurrentUser()");
    conflictResponse.resolve({ ok: false, status: 409 });
    await save;

    expect(context.fetch).toHaveBeenCalledTimes(3);
    expect(run("authUser.id")).toBe(43);
    expect(run("authUser.smartFlexPreference")).toBe(true);
    expect(run("authUser.smartFlexPreferenceVersion")).toBe(7);
    expectPreference(context, true, false);
    const feedback = context.document.getElementById(
      "smart-flex-preference-error",
    );
    expect(feedback.textContent).toBe("");
    expect(feedback.hidden).toBe(true);
  });

  test.each([
    ["500", () => Promise.resolve({ ok: false, status: 500 })],
    ["network failure", () => Promise.reject(new Error("network failure"))],
    ["malformed response", () => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: "false",
        smartFlexPreferenceVersion: 1,
      }),
    })],
    ["mismatched response", () => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: true,
        smartFlexPreferenceVersion: 1,
      }),
    })],
  ])("reconciles an uncertain save after %s", async (_, saveResponse) => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockImplementationOnce(saveResponse);
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 1,
        },
      }),
    });

    await changePreference(context, false);

    expect(context.fetch).toHaveBeenCalledTimes(3);
    expectPreference(context, false, false);
    expect(run("authUser.smartFlexPreference")).toBe(false);
    expect(context.console.error).toHaveBeenCalled();
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be confirmed");
  });

  test("keeps the preference disabled when reconciliation fails", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    run('searchAccess = { policy: {} }; searchAccessLoading = false');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    context.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await changePreference(context, false);

    expectPreference(context, false);
    expect(run("isCurrentUserVerified()")).toBe(false);
    expect(context.document.getElementById("smart-flex-preference-error").textContent)
      .toContain("could not be confirmed");
    expect(context.document.getElementById("search-access-status").textContent)
      .toContain("session could not be verified");
    expect(context.document.getElementById("search-button").disabled).toBe(true);
  });

  test("restores the unchanged server preference after an uncertain save", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockRejectedValueOnce(new Error("network failure"));

    await changePreference(context, false);

    expectPreference(context, true, false);
    expect(run("authUser.smartFlexPreference")).toBe(true);
    expect(context.fetch).toHaveBeenCalledTimes(3);
  });

  test("prioritizes session expiration when reconciliation returns 401", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    context.fetch.mockRejectedValueOnce(new Error("network failure"));
    context.fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await changePreference(context, false);

    expect(run("getToken()")).toBeNull();
    expectPreference(context, false);
    expect(context.document.getElementById("search-validation-error").textContent)
      .toContain("session has expired");
    expect(context.document.getElementById("smart-flex-preference-error").hidden)
      .toBe(true);
    expect(context.window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth-changed" }),
    );
  });

  test("waits for a pending save before revalidating the same session", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    let resolveSave;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    const save = changePreference(context, false);
    const verification = run("loadCurrentUser()");

    expectPreference(context, false);
    expect(context.fetch).toHaveBeenCalledTimes(2);
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 1,
        },
      }),
    });
    resolveSave({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: false,
        smartFlexPreferenceVersion: 1,
      }),
    });
    await save;
    await expect(verification).resolves.toBe("authenticated");
    expect(context.fetch).toHaveBeenCalledTimes(3);
    expectPreference(context, false, false);
    expect(run("authUser.smartFlexPreference")).toBe(false);
  });

  describe("Smart Flex save timeout", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test.each([
      ["fetch", true],
      ["body", true],
      ["fetch", false],
      ["body", false],
    ])("recovers from a stalled %s with waiting GET: %s", async (stage, waiting) => {
      const { context, run } = createBrowser();
      await run('saveToken("valid-token"); loadCurrentUser()');
      const readBody = jest.fn(() => new Promise(() => {}));
      if (stage === "fetch") {
        context.fetch.mockImplementationOnce(() => new Promise(() => {}));
      } else {
        context.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: readBody,
        });
      }

      const save = changePreference(context, false);
      const signal = context.fetch.mock.calls[1][1].signal;
      const verification = waiting ? run("loadCurrentUser()") : null;
      await jest.advanceTimersByTimeAsync(14999);
      expect(signal.aborted).toBe(false);
      expect(run("pendingSmartFlexSaves.size")).toBe(1);
      expect(context.fetch).toHaveBeenCalledTimes(2);
      expectPreference(context, waiting ? false : true);
      if (stage === "body") expect(readBody).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      await save;
      if (verification) {
        await expect(verification).resolves.toBe("authenticated");
      }

      expect(signal.aborted).toBe(true);
      expect(run("pendingSmartFlexSaves.size")).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      expect(context.fetch).toHaveBeenCalledTimes(3);
      expect(run("isCurrentUserVerified()")).toBe(true);
      expect(run("authUser.smartFlexPreference")).toBe(true);
      expectPreference(context, true, false);
      const feedback = context.document.getElementById(
        "smart-flex-preference-error",
      );
      expect(feedback.hidden).toBe(false);
      expect(feedback.textContent).toContain("could not be confirmed");
    });

    test.each(["success", "400", "401", "network"])(
      "clears the deadline after a settled %s save",
      async (outcome) => {
        const { context, run } = createBrowser();
        await run('saveToken("valid-token"); loadCurrentUser()');
        if (outcome === "network") {
          context.fetch.mockRejectedValueOnce(new Error("network failure"));
        } else {
          context.fetch.mockResolvedValueOnce({
            ok: outcome === "success",
            status: outcome === "success" ? 200 : Number(outcome),
            json: async () => ({
              success: true,
              smartFlexPreference: false,
              smartFlexPreferenceVersion: 1,
            }),
          });
        }

        await changePreference(context, false);
        const signal = context.fetch.mock.calls[1][1].signal;
        const fetchCount = context.fetch.mock.calls.length;
        expect(run("pendingSmartFlexSaves.size")).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
        await jest.advanceTimersByTimeAsync(15000);
        expect(signal.aborted).toBe(false);
        expect(context.fetch).toHaveBeenCalledTimes(fetchCount);
      },
    );

    test.each(["200", "401", "fetch rejection", "body success", "body rejection"])(
      "ignores a late %s after timeout and revalidation",
      async (outcome) => {
        const { context, run } = createBrowser();
        await run('saveToken("valid-token"); loadCurrentUser()');
        let resolveOperation;
        let rejectOperation;
        const delayed = new Promise((resolve, reject) => {
          resolveOperation = resolve;
          rejectOperation = reject;
        });
        if (outcome.startsWith("body")) {
          context.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => delayed,
          });
        } else {
          context.fetch.mockImplementationOnce(() => delayed);
        }

        const save = changePreference(context, false);
        const verification = run("loadCurrentUser()");
        await jest.advanceTimersByTimeAsync(15000);
        await save;
        await expect(verification).resolves.toBe("authenticated");
        const feedback = context.document.getElementById(
          "smart-flex-preference-error",
        );
        const message = feedback.textContent;

        if (outcome.endsWith("rejection")) {
          rejectOperation(new Error("late rejection"));
        } else if (outcome === "body success") {
          resolveOperation({
            success: true,
            smartFlexPreference: false,
            smartFlexPreferenceVersion: 1,
          });
        } else {
          resolveOperation({
            ok: outcome === "200",
            status: Number(outcome),
            json: async () => ({
              success: true,
              smartFlexPreference: false,
              smartFlexPreferenceVersion: 1,
            }),
          });
        }
        await jest.advanceTimersByTimeAsync(0);

        expect(run("getToken()")).toBe("valid-token");
        expect(run("isCurrentUserVerified()")).toBe(true);
        expect(run("authUser.smartFlexPreference")).toBe(true);
        expectPreference(context, true, false);
        expect(feedback.hidden).toBe(false);
        expect(feedback.textContent).toBe(message);
        expect(context.window.dispatchEvent).not.toHaveBeenCalled();
        expect(run("pendingSmartFlexSaves.size")).toBe(0);
        expect(context.fetch).toHaveBeenCalledTimes(3);
      },
    );

    test.each(["account switch", "logout"])(
      "does not report a timeout after %s",
      async (change) => {
        const { context, run } = createBrowser();
        await run('saveToken("old-token"); loadCurrentUser()');
        context.fetch.mockImplementationOnce(() => new Promise(() => {}));
        const save = changePreference(context, false);
        const signal = context.fetch.mock.calls[1][1].signal;

        if (change === "account switch") {
          run('saveToken("new-token")');
          context.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              user: {
                id: 43,
                plan: "premium",
                smartFlexPreference: true,
                smartFlexPreferenceVersion: 0,
              },
            }),
          });
          await run("loadCurrentUser()");
        } else {
          run("logout()");
        }

        await jest.advanceTimersByTimeAsync(15000);
        await save;

        expect(signal.aborted).toBe(true);
        expect(run("pendingSmartFlexSaves.size")).toBe(0);
        expect(context.document.getElementById("smart-flex-preference-error").hidden)
          .toBe(true);
        expect(context.document.getElementById("search-validation-error").hidden)
          .toBe(true);
        if (change === "account switch") {
          expect(run("getToken()")).toBe("new-token");
          expect(run("authUser.id")).toBe(43);
          expect(run("isCurrentUserVerified()")).toBe(true);
          expectPreference(context, true, false);
        } else {
          expect(run("getToken()")).toBeNull();
          expect(run("authUser")).toBeNull();
          expectPreference(context, false);
        }
      },
    );

    test.each([
      [401, true],
      [401, false],
      [500, true],
      [500, false],
    ])("handles GET %i after timeout with waiting GET: %s", async (status, waiting) => {
      const { context, run } = createBrowser();
      await run('saveToken("valid-token"); loadCurrentUser()');
      context.fetch.mockImplementationOnce(() => new Promise(() => {}));
      const save = changePreference(context, false);
      const verification = waiting ? run("loadCurrentUser()") : null;
      context.fetch.mockResolvedValueOnce({ ok: false, status });

      await jest.advanceTimersByTimeAsync(15000);
      await save;
      if (verification) {
        await expect(verification).resolves.toBe(
          status === 401 ? "anonymous" : "unavailable",
        );
      }

      expect(run("pendingSmartFlexSaves.size")).toBe(0);
      expectPreference(context, false);
      const feedback = context.document.getElementById(
        "smart-flex-preference-error",
      );
      if (status === 401) {
        expect(run("getToken()")).toBeNull();
        expect(feedback.hidden).toBe(true);
        expect(context.document.getElementById("search-validation-error").textContent)
          .toContain("session has expired");
      } else {
        expect(run("getToken()")).toBe("valid-token");
        expect(run("isCurrentUserVerified()")).toBe(false);
        expect(feedback.hidden).toBe(false);
        expect(feedback.textContent).toContain("could not be confirmed");
        if (!waiting) {
          expect(context.document.getElementById("search-access-status").textContent)
            .toContain("session could not be verified");
        }
      }
    });
  });

  test.each(["400", "401", "500", "network", "malformed"])(
    "reports a %s save failure after same-session revalidation",
    async (failure) => {
      const { context, run } = createBrowser();
      await run('saveToken("valid-token"); loadCurrentUser()');
      let resolveSave;
      let rejectSave;
      context.fetch.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            resolveSave = resolve;
            rejectSave = reject;
          }),
      );
      const save = changePreference(context, false);
      const verification = run("loadCurrentUser()");
      expect(context.fetch).toHaveBeenCalledTimes(2);
      expectPreference(context, false);

      context.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 42,
            plan: "registered",
            smartFlexPreference: true,
            smartFlexPreferenceVersion: 1,
          },
        }),
      });
      if (failure === "network") {
        rejectSave(new Error("network failure"));
      } else {
        resolveSave({
          ok: failure === "malformed",
          status: failure === "malformed" ? 200 : Number(failure),
          json: async () => ({
            success: true,
            smartFlexPreference: "false",
            smartFlexPreferenceVersion: 1,
          }),
        });
      }

      await save;
      await expect(verification).resolves.toBe("authenticated");

      expect(context.fetch).toHaveBeenCalledTimes(3);
      expectPreference(context, true, false);
      expect(run("getToken()")).toBe("valid-token");
      expect(run("isCurrentUserVerified()")).toBe(true);
      const feedback = context.document.getElementById(
        "smart-flex-preference-error",
      );
      expect(feedback.hidden).toBe(false);
      expect(feedback.textContent).toContain(
        ["400", "401"].includes(failure)
          ? "could not be saved"
          : "could not be confirmed",
      );
      expect(context.document.getElementById("search-validation-error").hidden)
        .toBe(true);
      expect(context.window.dispatchEvent).not.toHaveBeenCalled();
    },
  );

  test("clears only Smart Flex feedback after a successful retry", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    run('showSearchValidationError("Unrelated warning", { preserveSelection: true })');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await changePreference(context, false);
    const feedback = context.document.getElementById(
      "smart-flex-preference-error",
    );
    expect(feedback.hidden).toBe(false);

    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: false,
        smartFlexPreferenceVersion: 1,
      }),
    });
    await changePreference(context, false);

    expectPreference(context, false, false);
    expect(run("authUser.smartFlexPreference")).toBe(false);
    expect(feedback.hidden).toBe(true);
    expect(feedback.textContent).toBe("");
    expect(context.document.getElementById("search-validation-error").textContent)
      .toBe("Unrelated warning");
  });

  test("clears a previous save error when a successful retry overlaps revalidation", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("valid-token"); loadCurrentUser()');
    run('showSearchValidationError("Unrelated warning", { preserveSelection: true })');
    context.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await changePreference(context, false);
    const feedback = context.document.getElementById(
      "smart-flex-preference-error",
    );
    expect(feedback.hidden).toBe(false);

    let resolveSave;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    const save = changePreference(context, false);
    const verification = run("loadCurrentUser()");
    expect(context.fetch).toHaveBeenCalledTimes(3);
    expectPreference(context, false);

    let resolveVerification;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveVerification = resolve)),
    );
    resolveSave({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        smartFlexPreference: false,
        smartFlexPreferenceVersion: 1,
      }),
    });
    await save;

    expect(context.fetch).toHaveBeenCalledTimes(4);
    expectPreference(context, false);
    expect(run("isCurrentUserVerified()")).toBe(false);
    expect(feedback.hidden).toBe(true);
    expect(feedback.textContent).toBe("");
    expect(context.document.getElementById("search-validation-error").textContent)
      .toBe("Unrelated warning");

    resolveVerification({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 42,
          plan: "registered",
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 1,
        },
      }),
    });
    await expect(verification).resolves.toBe("authenticated");

    expectPreference(context, false, false);
    expect(run("authUser.smartFlexPreference")).toBe(false);
    expect(feedback.hidden).toBe(true);
    expect(context.document.getElementById("search-validation-error").textContent)
      .toBe("Unrelated warning");
  });

  test.each([400, 401])(
    "does not show a deferred %i save error when revalidation expires the session",
    async (status) => {
      const { context, run } = createBrowser();
      await run('saveToken("valid-token"); loadCurrentUser()');
      let resolveSave;
      context.fetch.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSave = resolve)),
      );
      const save = changePreference(context, false);
      const verification = run("loadCurrentUser()");
      context.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
      resolveSave({ ok: false, status });
      await save;
      await expect(verification).resolves.toBe("anonymous");

      expect(run("getToken()")).toBeNull();
      expect(run("authUser")).toBeNull();
      expectPreference(context, false);
      expect(context.document.getElementById("smart-flex-preference-error").hidden)
        .toBe(true);
      expect(context.document.getElementById("search-validation-error").textContent)
        .toContain("session has expired");
    },
  );

  test.each([400, 401])(
    "reports a deferred %i save failure when session revalidation is unavailable",
    async (status) => {
      const { context, run } = createBrowser();
      await run('saveToken("valid-token"); loadCurrentUser()');
      let resolveSave;
      context.fetch.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSave = resolve)),
      );
      const save = changePreference(context, false);
      const verification = run("loadCurrentUser()");
      context.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
      resolveSave({ ok: false, status });
      await save;
      await expect(verification).resolves.toBe("unavailable");

      expectPreference(context, false);
      expect(run("getToken()")).toBe("valid-token");
      expect(run("isCurrentUserVerified()")).toBe(false);
      const feedback = context.document.getElementById(
        "smart-flex-preference-error",
      );
      expect(feedback.hidden).toBe(false);
      expect(feedback.textContent).toContain("could not be saved");
    },
  );

  test.each([200, 401])(
    "handles a pending save response %i across pagehide and pageshow",
    async (status) => {
      const { context, run } = createBrowser();
      context.location = { hash: "" };
      context.document.getElementById("auth-container").querySelector = () => ({});
      run("searchPageInitialized = true; refreshSearchAccess = async () => {}");
      context.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 42,
            plan: "registered",
            smartFlexPreference: false,
            smartFlexPreferenceVersion: 0,
          },
        }),
      });
      await run('saveToken("valid-token"); loadCurrentUser()');
      expectPreference(context, false, false);

      let resolveSave;
      context.fetch.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSave = resolve)),
      );
      const save = changePreference(context, true);
      const pagehide = context.window.addEventListener.mock.calls.find(
        ([type]) => type === "pagehide",
      )[1];
      const pageshow = context.window.addEventListener.mock.calls.find(
        ([type]) => type === "pageshow",
      )[1];

      pagehide({ persisted: true });
      expectPreference(context, false);
      expect(run("isCurrentUserVerified()")).toBe(false);
      const restoration = pageshow({ persisted: true });
      expect(context.fetch).toHaveBeenCalledTimes(2);

      let resolveVerification;
      let markVerificationStarted;
      const verificationStarted = new Promise(
        (resolve) => (markVerificationStarted = resolve),
      );
      context.fetch.mockImplementationOnce(() => {
        const response = new Promise(
          (resolve) => (resolveVerification = resolve),
        );
        markVerificationStarted();
        return response;
      });
      resolveSave({
        ok: status === 200,
        status,
        json: async () => ({
          success: true,
          smartFlexPreference: true,
          smartFlexPreferenceVersion: 1,
        }),
      });
      await save;
      await verificationStarted;

      expectPreference(context, false);
      expect(run("authUser.smartFlexPreference")).toBe(false);
      expect(run("isCurrentUserVerified()")).toBe(false);
      expect(run("getToken()")).toBe("valid-token");
      expect(context.window.dispatchEvent).not.toHaveBeenCalled();
      expect(context.document.getElementById("smart-flex-preference-error").hidden)
        .toBe(true);

      const confirmedPreference = status === 200;
      resolveVerification({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 42,
            email: "session@example.com",
            plan: "registered",
            smartFlexPreference: confirmedPreference,
            smartFlexPreferenceVersion: 1,
          },
        }),
      });
      await restoration;

      expect(run("getToken()")).toBe("valid-token");
      expect(run("isCurrentUserVerified()")).toBe(true);
      expect(run("authUser.smartFlexPreference")).toBe(confirmedPreference);
      expectPreference(context, confirmedPreference, false);
      expect(context.window.dispatchEvent).not.toHaveBeenCalled();
      const feedback = context.document.getElementById(
        "smart-flex-preference-error",
      );
      expect(feedback.hidden).toBe(status === 200);
      if (status === 401) {
        expect(feedback.textContent).toContain("could not be saved");
      }
    },
  );

  test.each([200, 400, 401, 500])(
    "ignores a pending save response %i after switching accounts",
    async (status) => {
      const { context, run } = createBrowser();
      await run('saveToken("old-token"); loadCurrentUser()');
      let resolveSave;
      context.fetch.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSave = resolve)),
      );
      const save = changePreference(context, false);
      run('endSession(); saveToken("new-token")');
      context.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 43,
            plan: "premium",
            smartFlexPreference: true,
            smartFlexPreferenceVersion: 0,
          },
        }),
      });
      await run("loadCurrentUser()");
      resolveSave({
        ok: status === 200,
        status,
        json: async () => ({
          success: true,
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 1,
        }),
      });
      await save;

      expect(run("getToken()")).toBe("new-token");
      expect(run("authUser.id")).toBe(43);
      expectPreference(context, true, false);
      expect(context.document.getElementById("search-validation-error").hidden)
        .toBe(true);
      expect(context.document.getElementById("smart-flex-preference-error").hidden)
        .toBe(true);
    },
  );

  test.each([200, 401])(
    "ignores a pending save response %i after logout",
    async (status) => {
      const { context, run } = createBrowser();
      await run('saveToken("old-token"); loadCurrentUser()');
      let resolveSave;
      context.fetch.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSave = resolve)),
      );
      const save = changePreference(context, false);
      run("logout()");
      resolveSave({
        ok: status === 200,
        status,
        json: async () => ({
          success: true,
          smartFlexPreference: false,
          smartFlexPreferenceVersion: 1,
        }),
      });
      await save;
      expect(run("authUser")).toBeNull();
      expect(run("getToken()")).toBeNull();
      expectPreference(context, false);
      expect(context.document.getElementById("smart-flex-preference-error").hidden)
        .toBe(true);
    },
  );

  test("ignores a save body parsed after switching accounts", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    let resolveBody;
    let markBodyStarted;
    const bodyStarted = new Promise((resolve) => (markBodyStarted = resolve));
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => {
        const body = new Promise((resolve) => (resolveBody = resolve));
        markBodyStarted();
        return body;
      },
    });
    const save = changePreference(context, false);
    await bodyStarted;
    run('saveToken("new-token")');
    context.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 43,
          plan: "premium",
          smartFlexPreference: true,
          smartFlexPreferenceVersion: 0,
        },
      }),
    });
    await run("loadCurrentUser()");
    context.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await changePreference(context, false);
    const feedback = context.document.getElementById(
      "smart-flex-preference-error",
    );
    expect(feedback.hidden).toBe(false);
    resolveBody({
      success: true,
      smartFlexPreference: false,
      smartFlexPreferenceVersion: 1,
    });
    await save;

    expect(run("authUser.id")).toBe(43);
    expectPreference(context, true, false);
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toContain("could not be saved");
  });

  test("ignores a pending save after a cross-tab token change", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    let resolveSave;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    const save = changePreference(context, false);
    context.location = { hash: "" };
    context.localStorage.setItem("authToken", "new-token");
    const storageHandler = context.window.addEventListener.mock.calls.find(
      ([type]) => type === "storage",
    )[1];
    await storageHandler({ storageArea: context.localStorage, key: "authToken" });
    resolveSave({ ok: false, status: 401 });
    await save;
    expect(run("getToken()")).toBe("new-token");
    expectPreference(context, false);
  });

  test("does not report an old save after a cross-tab token round trip", async () => {
    const { context, run } = createBrowser();
    await run('saveToken("old-token"); loadCurrentUser()');
    let resolveSave;
    context.fetch.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    const save = changePreference(context, false);
    context.location = { hash: "" };
    const storageHandler = context.window.addEventListener.mock.calls.find(
      ([type]) => type === "storage",
    )[1];
    context.localStorage.setItem("authToken", "new-token");
    await storageHandler({ storageArea: context.localStorage, key: "authToken" });
    context.localStorage.setItem("authToken", "old-token");
    await storageHandler({ storageArea: context.localStorage, key: "authToken" });
    resolveSave({ ok: false, status: 400 });
    await save;
    await run("loadCurrentUser()");

    expectPreference(context, true, false);
    expect(context.document.getElementById("smart-flex-preference-error").hidden)
      .toBe(true);
  });
});
