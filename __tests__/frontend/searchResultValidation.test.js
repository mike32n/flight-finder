const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { getSafeBookingUrl } = require("../../public/js/booking-url");

const source = fs.readFileSync(
  path.join(__dirname, "../../public/js/app.js"),
  "utf8",
);

const storageKey = "flightFinder.lastSearch.v1";

function flight(price = 30000) {
  return {
    origin: { code: "BUD" },
    destination: { code: "AMS", city: "Amsterdam" },
    departure: "2020-03-06",
    return: "2020-03-08",
    price,
    currency: "HUF",
    bookingUrl: "https://example.com/booking",
    resultType: "base",
  };
}

function savedSearch() {
  return {
    ownerUserId: null,
    parameters: {
      origin: "BUD",
      destinations: ["AMS"],
      weekday: 5,
      nights: 2,
      startDate: "2020-03-01",
      startedAt: "2020-03-01T10:00:00.000Z",
    },
    results: [flight()],
    failedCount: 0,
    status: "completed",
  };
}

function createBrowser(saved = savedSearch(), user = null) {
  const storage = new Map([[storageKey, JSON.stringify(saved)]]);
  const footer = { textContent: "" };

  const container = {
    innerHTML: "",
    querySelectorAll: () => [],
    insertBefore: jest.fn(),
    appendChild: jest.fn(),
  };

  const createCard = jest.fn(() => ({ remove: jest.fn() }));

  const context = vm.createContext({
    window: { addEventListener() {} },
    document: {
      addEventListener() {},
      getElementById: (id) =>
        id === "results" ? container : id === "results-footer" ? footer : null,
      createElement: () => ({ appendChild() {} }),
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
    },
    authUser: user,
    getSafeBookingUrl,
    createCardMock: createCard,
    console: { warn: jest.fn() },
  });

  vm.runInContext(source, context);

  const app = vm.runInContext(
    `
    createCard = createCardMock;

    ({
      restore: restoreSearchState,
      insert: (item) => insertSortedWithDOM(
        item, document.getElementById("results")
      ),
      results: () => currentResults,
      setLimit: (limit) => { maxResults = limit; }
    })
  `,
    context,
  );

  return { app, storage, container, footer, createCard };
}

describe("search result validation", () => {
  test("restores valid historical results in price order", () => {
    const saved = savedSearch();
    saved.results = [flight(30000), flight(20000)];

    const { app, storage, createCard, footer } = createBrowser(saved);

    app.restore();

    expect(app.results().map((item) => item.price)).toEqual([20000, 30000]);
    expect(createCard).toHaveBeenCalledTimes(2);
    expect(storage.has(storageKey)).toBe(true);
    expect(footer.textContent).toBe("Finished...(failed: 0)");
  });

  test.each([
    ["results.0", null],
    ["results.0.destination", []],
    ["results.0.destination.city", {}],
    ["results.0.origin", { code: 123 }],
    ["results.0.departure", "2020-02-30"],
    ["results.0.return", "2020-03-05"],
    ["results.0.price", "30000"],
    ["results.0.currency", "INVALID"],
    ["results.0.bookingUrl", "javascript:alert(1)"],
    ["results.0.resultType", "unknown"],
    ["results.0.priceInsight", { percent: 20 }],
    ["parameters", null],
    ["parameters.startDate", "2020-02-30"],
    ["parameters.startedAt", "invalid"],
    ["parameters.destinations", ["AMS", "AMS"]],
    ["parameters.destinations", ["BUD"]],
    ["parameters.weekday", 7],
    ["parameters.nights", 0],
  ])("clears the saved search when %s is invalid", (field, value) => {
    const saved = savedSearch();
    const keys = field.split(".");
    const property = keys.pop();
    const target = keys.reduce((object, key) => object[key], saved);

    target[property] = value;

    const { app, storage, createCard } = createBrowser(saved);

    app.restore();

    expect(app.results()).toEqual([]);
    expect(createCard).not.toHaveBeenCalled();
    expect(storage.has(storageKey)).toBe(false);
  });

  test("rejects a saved search belonging to another user", () => {
    const saved = savedSearch();
    saved.ownerUserId = 1;

    const { app, storage, createCard } = createBrowser(saved, { id: 2 });

    app.restore();

    expect(createCard).not.toHaveBeenCalled();
    expect(storage.has(storageKey)).toBe(false);
  });

  test("skips a malformed live result and still accepts later results", () => {
    const { app, createCard } = createBrowser();

    expect(app.insert(flight(30000))).toBe(true);
    expect(app.insert({ ...flight(), price: Infinity })).toBe(false);
    expect(app.insert(flight(20000))).toBe(true);

    expect(app.results().map((item) => item.price)).toEqual([20000, 30000]);
    expect(createCard).toHaveBeenCalledTimes(2);
  });

  test("does not classify a valid result outside the top limit as malformed", () => {
    const { app, createCard } = createBrowser();
    app.setLimit(1);

    expect(app.insert(flight(20000))).toBe(true);
    expect(app.insert(flight(30000))).toBe(true);

    expect(app.results()).toHaveLength(1);
    expect(createCard).toHaveBeenCalledTimes(1);
  });

  test("accepts flex metadata and an omitted optional booking URL", () => {
    const { app } = createBrowser();
    const item = flight(20000);

    delete item.bookingUrl;

    item.resultType = "flex";
    item.priceInsight = { percent: 20, basePrice: 25000 };

    expect(app.insert(item)).toBe(true);
    expect(app.results()).toEqual([item]);
  });
});
