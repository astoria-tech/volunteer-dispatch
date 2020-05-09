const { when } = require("jest-when");

const { Random, nodeCrypto } = require("random-js");
const config = require("../../src/config");
const VolunteerService = require("../../src/service/volunteer-service");

const mockSample = jest.fn().mockImplementation((p) => p);
jest.mock("random-js", () => {
  return {
    Random: jest.fn().mockImplementation(() => {
      return {
        sample: mockSample,
      };
    }),
  };
});

describe("VolunteerService", () => {
  it("should construct a Random instance", () => {
    // eslint-disable-next-line no-new
    new VolunteerService(jest.fn());
    expect(Random).toHaveBeenCalledTimes(1);
    expect(Random).toHaveBeenCalledWith(nodeCrypto);
  });
  describe("findVolunteersForLoneliness", () => {
    let base;
    let service;
    let selectMock;
    let eachPageMock;
    beforeEach(() => {
      selectMock = jest.fn();
      base = { create: jest.fn(), update: jest.fn(), select: selectMock };
      eachPageMock = jest.fn();
      when(selectMock)
        .calledWith({
          view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
          filterByFormula: "{Account Disabled} != TRUE()",
        })
        .mockReturnValue({ eachPage: eachPageMock });
      service = new VolunteerService(base);
    });
    it("should call Airtable select and eachPage once and then sample results", async () => {
      expect.assertions(5);
      const volunteers = await service.findVolunteersForLoneliness();
      expect(selectMock).toHaveBeenCalledTimes(1);
      expect(eachPageMock).toHaveBeenCalledTimes(1);
      expect(mockSample).toHaveBeenCalledTimes(1);
      expect(mockSample).toHaveBeenCalledWith([], 0);
      expect(volunteers.length).toBe(0);
    });
  });
  describe("appendVolunteersForLoneliness", () => {
    let service;
    beforeEach(() => {
      service = new VolunteerService(jest.fn());
    });
    it("should return a function", () => {
      expect(typeof service.appendVolunteersForLoneliness([])).toBe("function");
    });
    it("should call next page once", () => {
      const nextPage = jest.fn();
      service.appendVolunteersForLoneliness([])([], nextPage);
      expect(nextPage.mock.calls.length).toBe(1);
    });
    it("should append volunteers capable of fulfilling tasks for loneliness", () => {
      const uselessVolunteerGetMock = jest.fn();
      when(uselessVolunteerGetMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue([]);
      const uselessVolunteer = {
        get: uselessVolunteerGetMock,
      };
      const usefulVolunteerGetMock = jest.fn();
      when(usefulVolunteerGetMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue(["Checking in on people"]);
      const usefulVolunteer = {
        get: usefulVolunteerGetMock,
      };
      const volunteers = [uselessVolunteer, usefulVolunteer];
      const lonelinessVolunteers = [];
      service.appendVolunteersForLoneliness(lonelinessVolunteers)(
        volunteers,
        jest.fn()
      );
      expect(lonelinessVolunteers).toEqual(
        expect.arrayContaining([usefulVolunteer])
      );
    });
  });
});
