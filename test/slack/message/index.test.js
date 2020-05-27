/* eslint-disable no-underscore-dangle */
/* Reason: rewire injects a .__get__ method that is necessary */
const rewire = require("rewire");

const message = rewire("../../../src/slack/message/");

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
      "Task Order": "2 of 3",
    };
  }

  get(field) {
    return this.fields[field];
  }

  set(field, value) {
    this.fields[field] = value;
    return this.fields[field];
  }
}

const mockVolunteers = [
  {
    record: { id: 42 },
    Id: 24,
    Name: "Jan",
    Distance: 4.2,
    Number: "212-222-2222",
  },
  {
    record: { id: 42 },
    Id: 25,
    Name: "Joe",
    Distance: 4.2,
    Number: "+1 212-222-2222",
  },
  {
    record: { id: 42 },
    Id: 26,
    Name: "Mary",
    Distance: 4.2,
    Number: "(212) 222-2222",
  },
  {
    record: { id: 42 },
    Id: 27,
    Name: "Jill",
    Distance: 4.2,
    Number: "+1 (212) 222-2222",
  },
  {
    record: { id: 42 },
    Id: 28,
    Name: "Steven",
    Distance: 4.2,
    Number: "2122222222",
  },
  {
    record: { id: 42 },
    Id: 29,
    Name: "Nancy",
    Distance: 4.2,
    Number: "+12122222222",
  },
  {
    record: { id: 42 },
    Id: 30,
    Name: "Jane",
    Distance: 4.2,
    Number: "+121222222222",
  },
  {
    record: { id: 42 },
    Id: 31,
    Name: "Anthony",
    Distance: 4.2,
    Number: "n/a",
  },
  {
    record: { id: 42 },
    Id: 32,
    Name: "Jason",
    Distance: 4.2,
    Number: undefined,
  },
];

const validateSection = (section) => {
  let result = true;

  if (!Object.prototype.hasOwnProperty.call(section, "type")) result = false;
  if (!Object.prototype.hasOwnProperty.call(section, "text")) result = false;
  if (!Object.prototype.hasOwnProperty.call(section.text, "type"))
    result = false;
  if (!Object.prototype.hasOwnProperty.call(section.text, "text"))
    result = false;

  if (section.type && !section.type === "section") result = false;
  if (section.text.type && !section.text.type === "mrkdwn") result = false;

  return result;
};

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

describe("The primary message", () => {
  test("The message heading should be a section", () => {
    const options = { reminder: false };
    options.text = message.getText(options);
    const headingSection = message.getHeading(options);

    expect(validateSection(headingSection)).toBe(true);
  });

  test("The message heading is different if the message is a reminder", () => {
    const options = { reminder: false };
    options.text = message.getText(options);
    let headingSection = message.getHeading(options);

    expect(headingSection.text.text).toEqual(
      expect.stringContaining("A new errand has been added")
    );

    options.reminder = true;
    options.text = message.getText(options);
    headingSection = message.getHeading(options);

    expect(headingSection.text.text).toEqual(
      expect.stringContaining("Reminder for a previous request")
    );
  });

  describe("Task order", () => {
    test("If task is split from a multi-task request, display task order", () => {
      const requester = new MockRequestRecord();
      const taskOrderSection = message.getTaskOrder(requester);

      expect(taskOrderSection.text.text).toEqual(
        expect.stringContaining(requester.get("Task Order"))
      );
    });

    test("The task order info should be a section", () => {
      const requester = new MockRequestRecord();
      const taskOrderSection = message.getTaskOrder(requester);

      expect(validateSection(taskOrderSection)).toBe(true);
    });
  });

  describe("Requester info", () => {
    test("If no requester name is specified, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Name", undefined);

      const requesterSection = message.getRequester(requester);
      const expected = `:heart: No name provided`;
      expect(requesterSection.text.text).toEqual(
        expect.stringContaining(expected)
      );
    });

    test("If 1 requester language is specified, the language is returned as-is", () => {
      const requester = new MockRequestRecord();

      const getLanguage = message.__get__("getLanguage");

      expect(getLanguage(requester)).toBe("English");
    });

    test("If 2 or more requester languages are specified, a comma-separated list is returned", () => {
      const requester = new MockRequestRecord();
      const getLanguage = message.__get__("getLanguage");

      expect(getLanguage(requester)).toBe("English");
    });

    test("If no requester language is specified, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Language", "English");
      requester.set("Language - other", "Japanese");

      const getLanguage = message.__get__("getLanguage");

      expect(getLanguage(requester)).toBe("English, Japanese");
    });

    test("If no requester address is specified, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Address", undefined);

      const requesterSection = message.getRequester(requester);
      const expected = `:house: None provided`;
      expect(requesterSection.text.text).toEqual(
        expect.stringContaining(expected)
      );
    });

    test("The requester info should be a section", () => {
      const requester = new MockRequestRecord();
      const requesterSection = message.getRequester(requester);

      expect(validateSection(requesterSection)).toBe(true);
    });
  });

  describe("Task list", () => {
    // no data passed
    test("If no tasks are passed in, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Tasks", undefined);
      requester.set("Task - other", undefined);

      const getFormattedTasks = message.__get__("formatTasks");

      expect(getFormattedTasks(requester)).toBe("None provided");
    });

    // only regular tasks passed
    test("If standard tasks are passed in, a standard list is returned", () => {
      const requester = new MockRequestRecord();
      const taskList = ["Dog walking", "Grocery shopping"];
      requester.set("Tasks", taskList);

      const getFormattedTasks = message.__get__("formatTasks");
      const bullet = ":small_orange_diamond:";

      expect(getFormattedTasks(requester)).toBe(
        `\n${bullet} ${taskList[0]}\n${bullet} ${taskList[1]}`
      );
    });

    // only other task passed
    test("If only an 'Other' task is passed in, the warning and task is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Tasks", ["Other"]);
      requester.set("Task - other", "Moving house");

      const getFormattedTasks = message.__get__("formatTasks");
      const bullet = ":small_orange_diamond:";
      const warning =
        ':warning: _"Other" request: volunteers might not be the best match_';

      expect(getFormattedTasks(requester)).toBe(
        `\n${warning}\n${bullet} Moving house`
      );
    });

    // mix of regular and other task passed
    test("If an 'Other' task is passed along with regular tasks, the task list plus the warning is returned", () => {
      const requester = new MockRequestRecord();
      const taskList = ["Grocery shopping", "Other"];
      requester.set("Tasks", taskList);
      requester.set("Task - other", "Moving house");

      const getFormattedTasks = message.__get__("formatTasks");
      const bullet = "\n:small_orange_diamond:";
      const warning =
        '\n:warning: _"Other" request: volunteers might not be the best match_';

      const formattedTasks = getFormattedTasks(requester);

      const bullet1 = `${bullet} ${taskList[0]}`;
      const bullet2 = `${bullet} Moving house`;

      expect(formattedTasks).toBe(`${bullet1}${warning}${bullet2}`);
    });

    test("Tasks should be a section", () => {
      const requester = new MockRequestRecord();
      const tasksSection = message.getTasks(requester);

      expect(validateSection(tasksSection)).toBe(true);
    });
  });

  describe("Timeframe section", () => {
    test("Requested timeframe should return as decorated string", () => {
      const requester = new MockRequestRecord();

      expect(message.getTimeframe(requester).text.text).toBe(
        `*Requested timeframe:* Within 2 days`
      );
    });

    test("If no timeframe is requested, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Timeframe", undefined);

      expect(message.getTimeframe(requester).text.text).toBe(
        "*Requested timeframe:* None provided"
      );
    });

    test("Timeframe should be a section", () => {
      const requester = new MockRequestRecord();
      const timeframeSection = message.getTimeframe(requester);

      expect(validateSection(timeframeSection)).toBe(true);
    });
  });
});

describe("The second request info message", () => {
  describe("The subsidy section", () => {
    test("Subsidy requests are represented by an emoji", () => {
      const requester = new MockRequestRecord();
      const property =
        "Please note, we are a volunteer-run organization, but may be able to help offset some of the cost of hard goods. Do you need a subsidy for your assistance?";
      requester.set(property, true);

      expect(message.getSubsidyRequest(requester).text.text).toBe(
        "*Subsidy requested:* :white_check_mark:"
      );
    });

    test("Absence of subsidy request is represented by an emoji", () => {
      const requester = new MockRequestRecord();
      const property =
        "Please note, we are a volunteer-run organization, but may be able to help offset some of the cost of hard goods. Do you need a subsidy for your assistance?";
      requester.set(property, undefined);

      expect(message.getSubsidyRequest(requester).text.text).toBe(
        "*Subsidy requested:* :no_entry_sign:"
      );
    });

    test("Subsidy request should be a section", () => {
      const requester = new MockRequestRecord();
      const subsidySection = message.getSubsidyRequest(requester);

      expect(validateSection(subsidySection)).toBe(true);
    });
  });

  describe("The other notes/anything else section", () => {
    test("A long string should be truncated", () => {
      const response = "o".repeat(3000);
      const id = "fakeId";

      const truncateLongResponses = message.__get__("truncateLongResponses");
      const truncatedResponse = truncateLongResponses(response, id);

      expect(truncatedResponse).toEqual(
        expect.stringContaining("See Airtable record for full response.>")
      );
    });

    test("'Anything else' notes should return as decorated string", () => {
      const requester = new MockRequestRecord();
      requester.set("Anything else", "Other errands");

      expect(message.getAnythingElse(requester).text.text).toBe(
        `*Other notes from requester:* \nOther errands`
      );
    });

    test("If no 'Anything else' notes are provided, a human readable string is returned", () => {
      const requester = new MockRequestRecord();
      requester.set("Anything else", undefined);

      expect(message.getAnythingElse(requester).text.text).toBe(
        "*Other notes from requester:* \nNone provided"
      );
    });

    test("'Anything else' notes should be a section", () => {
      const requester = new MockRequestRecord();
      const anythingElseSection = message.getAnythingElse(requester);

      expect(validateSection(anythingElseSection)).toBe(true);
    });
  });
});

describe("The volunteers message", () => {
  describe("The volunteers heading", () => {
    test("If N volunteers are passed, the heading displays the count", () => {
      const volunteerHeading = `*Here are the ${mockVolunteers.length} closest volunteers:*`;

      expect(message.getVolunteerHeading(mockVolunteers).text.text).toBe(
        volunteerHeading
      );
    });

    test("If no volunteers are passed, a human readable string is returned", () => {
      const volunteers = undefined;
      const noneFoundText =
        "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

      expect(message.getVolunteerHeading(volunteers).text.text).toBe(
        noneFoundText
      );
    });

    test("Volunteer heading should be a section", () => {
      const volunteerHeadingSection = message.getVolunteerHeading(
        mockVolunteers
      );

      expect(validateSection(volunteerHeadingSection)).toBe(true);
    });
  });

  describe("The volunteers list", () => {
    test("Volunteers list is an array", () => {
      const volunteerSections = message.getVolunteers(mockVolunteers);

      expect(Array.isArray(volunteerSections)).toBe(true);
    });

    test("Volunteers list elements should all be sections", () => {
      const mockTaskCount = new Map([["24", 2]]);
      const volunteerSections = message.getVolunteers(
        mockVolunteers,
        mockTaskCount
      );

      volunteerSections.map((section) =>
        expect(validateSection(section)).toBe(true)
      );
    });
  });
});

describe("The copy/paste numbers message", () => {
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

  test("If no volunteers are available, a human readable string is returned", () => {
    const noneFoundText = "No numbers to display";
    expect(message.getCopyPasteNumbers([])).toBe(noneFoundText);
  });
});
