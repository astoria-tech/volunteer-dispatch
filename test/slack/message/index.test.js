const v8 = require("v8");
const message = require("../../../src/slack/message/");

class MockRequestRecord {
  constructor() {
    this.fields = {
      Timeframe: "Within 2 days",
      Name: "Jest test",
      "Phone number": "202-555-0106",
      Language: "English",
      City: "Astoria",
      Address: "25-82 36th Street",
      Status: "Needs assigning",
      Tasks: ["Dog walking"],
    };
  }

  get(field) {
    return this.fields[field];
  }

  set(field, value) {
    return (this.fields[field] = value);
  }
}

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

test("The message heading should be a section", () => {
  const headingSection = message.getHeading();

  expect(headingSection).toHaveProperty("type");
  expect(headingSection).toHaveProperty("text");
  expect(headingSection).toHaveProperty("text.type");
  expect(headingSection).toHaveProperty("text.text");
});

test("The requester info should be a section", () => {
  const requester = new MockRequestRecord();
  const requesterSection = message.getRequester(requester);

  expect(requesterSection).toHaveProperty("type", "section");
  expect(requesterSection).toHaveProperty("text");
  expect(requesterSection).toHaveProperty("text.type", "mrkdwn");
  expect(requesterSection).toHaveProperty("text.text");
});

test("If no requester language is specified, a human readable string is returned", () => {
  const requester = new MockRequestRecord();
  requester.set("Language", undefined);
  const requesterSection = message.getRequester(requester);

  expect(requesterSection.text.text).toEqual(
    expect.stringContaining(":speaking_head_in_silhouette: None specified")
  );
});

test("Copy/paste numbers section should only contain expected values", () => {
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
