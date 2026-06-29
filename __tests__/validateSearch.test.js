const validateSearch = require("../middlewares/validateSearch");

describe("validateSearch", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        destinations: ["BCN"],
        weekday: 2,
        nights: 3,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test("calls next for valid payload", () => {
    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test.each([[{ destinations: [] }], [{ destinations: "BCN" }]])(
    "rejects invalid destinations",
    (override) => {
      Object.assign(req.body, override);

      validateSearch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    },
  );

  test.each([-1, 7, "2"])("rejects invalid weekday %p", (weekday) => {
    req.body.weekday = weekday;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([0, 31, "3"])("rejects invalid nights %p", (nights) => {
    req.body.nights = nights;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("rejects invalid flexibility", () => {
    req.body.flexibility = "invalid";

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each(["none", "controlled", "smart"])(
    "accepts flexibility %s",
    (flexibility) => {
      req.body.flexibility = flexibility;

      validateSearch(req, res, next);

      expect(next).toHaveBeenCalled();
    },
  );
});
