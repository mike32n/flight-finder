const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createApp() {
  const context = vm.createContext({
    URL,
    window: {
      addEventListener: jest.fn(),
      open: jest.fn(),
    },
  });

  for (const file of ["booking-url.js", "app.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "../../public/js", file),
      "utf8",
    );

    vm.runInContext(source, context, { filename: file });
  }

  return context;
}

describe("booking navigation", () => {
  test("does not open an unsafe booking URL", () => {
    const context = createApp();
    context.result = { bookingUrl: "javascript:alert(1)" };

    vm.runInContext("openFlight(result)", context);

    expect(context.window.open).not.toHaveBeenCalled();
  });

  test("opens a valid booking URL with opener and referrer protection", () => {
    const context = createApp();
    const url = "https://www.google.com/travel/flights?test";

    context.result = { bookingUrl: url };

    vm.runInContext("openFlight(result)", context);

    expect(context.window.open).toHaveBeenCalledTimes(1);
    expect(context.window.open).toHaveBeenCalledWith(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  });
});
