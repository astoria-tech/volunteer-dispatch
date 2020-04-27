const {
  getDisplayNumber,
} = require("../../../src/slack/message/phone-number-utils");

test("Return kebab-case number when passed number is formatted with parens", () => {
  expect(getDisplayNumber("(212) 222-2222")).toBe("212-222-2222");
});

test("Return parsed number when 10 unformatted digits are passed", () => {
  expect(getDisplayNumber("2122222222")).toBe("212-222-2222");
});

test("Return parsed number when 11 unformattted digits are passed", () => {
  expect(getDisplayNumber("12122222222")).toBe("212-222-2222");
});

test("Return a human readable string if no value is passed", () => {
  expect(getDisplayNumber()).toBe("None provided");
});

test("Return raw input (plus flag string) if unparseable value is passed", () => {
  const unparseableValue = "n/a";
  expect(getDisplayNumber(unparseableValue)).toBe(
    `${unparseableValue} _[Bot note: unparseable number.]_`
  );
});
