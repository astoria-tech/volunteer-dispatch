const message = require("../../../src/slack/message/");

test("Get a basic section", () => {
  const text = "Hello, World!";

  const sectionObject = {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };

  expect(message.getSection(text)).toMatchObject(sectionObject);
});

test("Copy/paste numbers section should only contain expected values", () => {
  const mockVolunteers = [
    { Number: "212-222-2222" },
    { Number: "+1 212-222-2222" },
    { Number: "(212) 222-2222" },
    { Number: "+1 (212) 222-2222" },
    { Number: "2122222222" },
    { Number: "+12122222222" },
    { Number: "+121222222222" },
    { Number: "n/a" },
    { Number: undefined },
  ];

  const expected = [
    "212-222-2222",
    "212-222-2222",
    "212-222-2222",
    "212-222-2222",
    "212-222-2222",
    "212-222-2222",
    "212-222-2222",
    "n/a _[Bot note: unparseable number.]_",
    "None provided",
  ];

  const copyPasteNumbers = message
    .getCopyPasteNumbers(mockVolunteers)
    .split("\n");

  expect(copyPasteNumbers).toEqual(expect.arrayContaining(expected));
});
