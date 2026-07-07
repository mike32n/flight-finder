describe("providerFactory", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("creates mock provider", () => {
    jest.doMock("../config/providers", () => ({
      type: "mock",
    }));

    const { getProvider } = require("../providers/providerFactory");

    const provider = getProvider();

    expect(provider.constructor.name).toBe("MockProvider");
  });

  test("creates amadeus provider", () => {
    jest.doMock("../config/providers", () => ({
      type: "amadeus",
      clientId: "x",
      clientSecret: "y",
      hostname: "test",
    }));

    const { getProvider } = require("../providers/providerFactory");

    const provider = getProvider();

    expect(provider.constructor.name).toBe("AmadeusProvider");
  });

  test("creates serpapi provider", () => {
    jest.doMock("../config/providers", () => ({
      type: "serpapi",
      apiKey: "test-key",
    }));

    const { getProvider } = require("../providers/providerFactory");

    const provider = getProvider();

    expect(provider.constructor.name).toBe("SerpApiProvider");
  });
});
