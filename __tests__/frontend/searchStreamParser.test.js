const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { TextDecoder, TextEncoder } = require("node:util");

const source = fs.readFileSync(
  path.join(__dirname, "../../public/js/app.js"),
  "utf8",
);

function createParser() {
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { addEventListener() {} },
  });

  vm.runInContext(source, context);

  return vm.runInContext("createSearchEventParser()", context);
}

describe("search stream parser", () => {
  test.each([
    ["event: end"],
    ["event: error"],
    ["event: fail"],
    ["data: extra"],
  ])("keeps %s inside the payload", (text) => {
    const parse = createParser();
    const data = JSON.stringify({ city: text });

    expect(parse(`data: ${data}\n\n`)).toEqual([{ type: "message", data }]);
  });

  test.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["CR", "\r"],
  ])("handles every two-chunk boundary with %s line endings", (_, newline) => {
    const stream = [
      'data: {"price":30000}',
      "",
      "event: fail",
      "data: fail",
      "",
      "event: end",
      "data: done",
      "",
      "",
    ].join(newline);

    const expected = [
      { type: "message", data: '{"price":30000}' },
      { type: "fail", data: "fail" },
      { type: "end", data: "done" },
    ];

    for (let split = 0; split <= stream.length; split++) {
      const parse = createParser();

      expect([
        ...parse(stream.slice(0, split)),
        ...parse(stream.slice(split)),
      ]).toEqual(expected);
    }
  });

  test("joins data lines and removes at most one leading space", () => {
    const parse = createParser();

    expect(parse("data:first\ndata: second\ndata:  third\n\n")).toEqual([
      { type: "message", data: "first\nsecond\n third" },
    ]);
  });

  test("ignores comments and unused fields and resets the event type", () => {
    const parse = createParser();

    expect(parse(": heartbeat\nid: 1\nretry: 1000\nevent: end\n\n")).toEqual(
      [],
    );

    expect(parse("data: next\n\n")).toEqual([
      { type: "message", data: "next" },
    ]);
  });

  test("waits for a blank line before returning an event", () => {
    const parse = createParser();

    expect(parse("event: end\ndata: done\n")).toEqual([]);
    expect(parse("\n")).toEqual([{ type: "end", data: "done" }]);
  });

  test("supports empty data and an explicitly empty event type", () => {
    const parse = createParser();

    expect(parse("event: fail\nevent:\ndata\n\n")).toEqual([
      { type: "message", data: "" },
    ]);
  });

  test("preserves UTF-8 text when bytes arrive individually", () => {
    const parse = createParser();
    const decoder = new TextDecoder();
    const data = JSON.stringify({ city: "Málaga ✈️" });
    const bytes = new TextEncoder().encode(`data: ${data}\n\n`);
    const events = [];

    for (const byte of bytes) {
      events.push(
        ...parse(decoder.decode(Uint8Array.of(byte), { stream: true })),
      );
    }

    events.push(...parse(decoder.decode()));

    expect(events).toEqual([{ type: "message", data }]);
  });
});
