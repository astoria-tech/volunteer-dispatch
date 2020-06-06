const { filterByLanguage } = require("../src/languageFilter");

class MockRecord {
  constructor(fields) {
    this.fields = fields;
  }

  get(field) {
    return this.fields[field];
  }

  set(field, value) {
    this.fields[field] = value;
    return this.fields;
  }
}

const request = new MockRecord({});

const mockVolunteerData = [
  [
    {
      "Full Name": "Hugh Hamer",
      "Please provide your contact phone number:": "202-555-0171",
      "Please select any language you have verbal fluency with:": [
        "Greek",
        "Hebrew",
      ],
    },
    0.17,
  ],
  [
    {
      "Full Name": "Siraj Harvey",
      "Please provide your contact phone number:": "202-555-0171",
      "Please select any language you have verbal fluency with:": [
        "Arabic",
        "Spanish",
      ],
    },
    0.54,
  ],
  [
    {
      "Full Name": "Lexie Pacheco",
      "Please provide your contact phone number:": "202-555-0171",
      "Please select any language you have verbal fluency with:": [
        "Polish",
        "Spanish",
      ],
    },
    0.32,
  ],
  [
    {
      "Full Name": "Whitney Elwood",
      "Please provide your contact phone number:": "202-555-0171",
      "Please select any language you have verbal fluency with:": [
        "Arabic",
        "Spanish",
      ],
    },
    0.04,
  ],
  [
    {
      "Full Name": "Jaydan Cook",
      "Please provide your contact phone number:": "202-555-0171",
      "Please select any language you have verbal fluency with:": [],
    },
    0.33,
  ],
];

const volunteerDistances = [];

for (const data of mockVolunteerData) {
  const [fields, distance] = data;
  volunteerDistances.push([new MockRecord(fields), distance]);
}

describe("Volunteer list language filter", () => {
  it("should not filter volunteer list when requester's language isn't specified", () => {
    const filteredVolunteers = filterByLanguage(request, volunteerDistances);
    expect(filteredVolunteers.length).toBe(5);
  });

  it("should not filter volunteer list when requester's language is 'English'", () => {
    request.set("Language", "English");
    const filteredVolunteers = filterByLanguage(request, volunteerDistances);
    expect(filteredVolunteers.length).toBe(5);
  });

  it("should filter out volunteers who don't speak requester's language", () => {
    request.set("Language", "Spanish");
    const filteredVolunteers = filterByLanguage(request, volunteerDistances);
    expect(filteredVolunteers.length).toBe(3);
  });

  it("should return an empty list if no volunteers speak requester's language", () => {
    request.set("Language", "Bengali");
    const filteredVolunteers = filterByLanguage(request, volunteerDistances);
    expect(filteredVolunteers.length).toBe(0);
  });
});
