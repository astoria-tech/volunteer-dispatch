const { when } = require("jest-when");
const Task = require("../src/task");

describe("Task", () => {
  describe("mapFromRawTask", () => {
    it("raw string maps to correct task", () => {
      const rawtask = "Grocery shopping";
      const mappedtask = Task.mapFromRawTask(rawtask);
      expect(mappedtask.rawTask).toBe(rawtask);
      expect(mappedtask.supportRequirements).toEqual([
        "Picking up groceries/medications",
      ]);
    });
  });
  describe("canBeFulfilledByVolunteer", () => {
    it("should throw error if volunteer does not have get function", () => {
      const task = Task.mapFromRawTask("Grocery shopping");
      const volunteer = {};
      expect(() => task.canBeFulfilledByVolunteer(volunteer)).toThrowError();
    });
    it("should return false if volunteer does not have any supporting capabilities", () => {
      const getMock = jest.fn();
      when(getMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue([]);
      const volunteer = { get: getMock };
      const task = Task.mapFromRawTask("Grocery shopping");
      expect(task.canBeFulfilledByVolunteer(volunteer)).toBeFalsy();
    });
    it("should return false if volunteer does have capabilities but none supporting the task at hand", () => {
      const getMock = jest.fn();
      when(getMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue([
          "Check-in on folks throughout the day (in-person or phone call)",
        ]);
      const volunteer = { get: getMock };
      const task = Task.mapFromRawTask("Grocery shopping");
      expect(task.canBeFulfilledByVolunteer(volunteer)).toBeFalsy();
    });
    it("should return true if volunteer does have supporting capabilities", () => {
      const getMock = jest.fn();
      when(getMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue(["Picking up groceries/medications"]);
      const volunteer = { get: getMock };
      const task = Task.mapFromRawTask("Grocery shopping");
      expect(task.canBeFulfilledByVolunteer(volunteer)).toBeTruthy();
    });
    it("should return false if task requires volunteer to have a car, but volunteer does not have one", () => {
      const getMock = jest.fn();
      when(getMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue([])
        .calledWith(
          "Do you have a private mode of transportation with valid license/insurance? "
        )
        .mockReturnValue([]);
      const volunteer = { get: getMock };
      const task = Task.mapFromRawTask(
        "Transportation to/from a medical appointment"
      );
      expect(task.canBeFulfilledByVolunteer(volunteer)).toBeFalsy();
    });
    it("should return true if task requires volunteer to have a car and volunteer has one", () => {
      const getMock = jest.fn();
      when(getMock)
        .calledWith("I can provide the following support (non-binding)")
        .mockReturnValue([])
        .calledWith(
          "Do you have a private mode of transportation with valid license/insurance? "
        )
        .mockReturnValue(["Yes, I have a car"]);
      const volunteer = { get: getMock };
      const task = Task.mapFromRawTask(
        "Transportation to/from a medical appointment"
      );
      expect(task.canBeFulfilledByVolunteer(volunteer)).toBeTruthy();
    });
  });
  describe("equals", () => {
    it.each`
      task                                | raw
      ${Task.GROCERY_SHOPPING}            | ${"Grocery shopping"}
      ${Task.PRESCRIPTION_PICKUP}         | ${"Picking up a prescription"}
      ${Task.MEDICAL_APPT_TRANSPORTATION} | ${"Transportation to/from a medical appointment"}
      ${Task.DOG_WALKING}                 | ${"Dog walking"}
      ${Task.LONELINESS}                  | ${"Loneliness"}
      ${Task.ACCESS_HEALTH_INFO}          | ${"Accessing verified health information"}
      ${Task.OTHER}                       | ${"Other"}
    `("should return true if rawTasks match", ({ task, raw }) => {
      expect(task.equals(new Task(raw, [], []))).toBeTruthy();
    });
  });
});
