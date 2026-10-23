const { EventEmitter } = require("node:events");

jest.mock("../../models/destinationModel", () => ({
  getAllDestinations: jest.fn(),
}));

jest.mock("../../services/flightSearchService", () => ({
  searchFlights: jest.fn(),
  searchFlightsStream: jest.fn(),
}));

const service = require("../../services/flightSearchService");
const controller = require("../../controllers/searchController");

function createResponse() {
  const res = new EventEmitter();

  res.destroyed = false;
  res.writableEnded = false;

  res.setHeader = jest.fn();
  res.write = jest.fn().mockReturnValue(true);
  res.status = jest.fn().mockReturnValue(res);

  res.json = jest.fn(() => {
    res.writableEnded = true;
    return res;
  });

  res.end = jest.fn(() => {
    res.writableEnded = true;
    return res;
  });

  return res;
}

describe.each([
  ["JSON", "search", "searchFlights"],
  ["SSE", "searchStream", "searchFlightsStream"],
])("%s search connection", (_, handlerName, serviceName) => {
  let req;
  let res;
  let searchMock;

  beforeEach(() => {
    service.searchFlights.mockReset();
    service.searchFlightsStream.mockReset();

    searchMock = service[serviceName];
    req = { searchParameters: { destinations: ["AMS"] } };
    res = createResponse();
  });

  test("does not start a search on an already closed response", async () => {
    res.destroyed = true;

    await controller[handlerName](req, res);

    expect(searchMock).not.toHaveBeenCalled();
    expect(res.listenerCount("close")).toBe(0);
  });

  test.each(["resolve", "reject"])(
    "ignores a late %s after disconnect",
    async (outcome) => {
      let finishSearch;
      let failSearch;

      searchMock.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finishSearch = resolve;
            failSearch = reject;
          }),
      );

      const request = controller[handlerName](req, res);
      const options = searchMock.mock.calls[0][0];

      res.destroyed = true;
      res.emit("close");

      expect(options.signal.aborted).toBe(true);

      options.onResult?.({
        type: "data",
        data: { price: 25000 },
      });

      options.onResult?.({ type: "fail" });

      if (outcome === "resolve") {
        finishSearch({ results: [], failedRequests: 0 });
      } else {
        failSearch(new Error("Search failed after disconnect"));
      }

      await request;

      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.listenerCount("close")).toBe(0);
    },
  );

  test("completes a connected response and removes its listener", async () => {
    const result = { results: [], failedRequests: 0 };
    searchMock.mockResolvedValueOnce(result);

    await controller[handlerName](req, res);

    expect(searchMock.mock.calls[0][0].signal.aborted).toBe(false);

    expect(res.listenerCount("close")).toBe(0);

    if (handlerName === "search") {
      expect(res.json).toHaveBeenCalledWith(result);
    } else {
      expect(res.end).toHaveBeenCalledWith("event: end\ndata: done\n\n");
    }
  });

  test("reports errors only while connected and removes its listener", async () => {
    searchMock.mockRejectedValueOnce(new Error("Search failed"));

    await controller[handlerName](req, res);

    expect(res.listenerCount("close")).toBe(0);

    if (handlerName === "search") {
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal error",
      });
    } else {
      expect(res.end).toHaveBeenCalledWith("event: error\ndata: error\n\n");
    }
  });
});
