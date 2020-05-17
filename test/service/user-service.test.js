const UserService = require("../../src/service/user-service");
const phoneNumberUtils = require("../../src/utils/phone-number-utils");

jest.mock("../../src/utils/phone-number-utils");
jest.mock("../../src/config", () => {
  return {
    AIRTABLE_USERS_VIEW_NAME: "Grid View",
  };
});
const mockUsersViewName = "Grid View";

const fullName = "Ezekiel Adams";
const phoneNumber = "055.956.1902";
const records = [
  {
    get: (field) => {
      switch (field) {
        case "Full Name":
          return fullName;
        case "Phone Number":
          return phoneNumber;
        default:
          return "";
      }
    },
  },
];

describe("UserService", () => {
  let service;
  let base;
  let mockSelect;
  let mockFirstPage;
  beforeEach(() => {
    mockFirstPage = jest.fn();
    mockSelect = jest.fn();
    mockSelect.mockReturnValue({ firstPage: mockFirstPage });
    base = {
      select: mockSelect,
    };
    service = new UserService(base);
    phoneNumberUtils.getDisplayNumber.mockReturnValue(phoneNumber);
  });
  describe("findUserByPhoneNumber", () => {
    it("should check is supplied argument is a string", async () => {
      expect.assertions(2);
      // noinspection JSCheckFunctionSignatures
      await expect(service.findUserByPhoneNumber()).rejects.toThrow(
        "Variable should be a String."
      );
      // noinspection JSCheckFunctionSignatures
      await expect(service.findUserByPhoneNumber(9)).rejects.toThrow(
        "Variable should be a String."
      );
    });
    const expectedFilterByFormula = `{Phone Number} = '${phoneNumber}'`;
    it("should throw error if more than one records are found for given number", async () => {
      expect.assertions(3);
      mockFirstPage.mockReturnValue([records[0], records[1]]);
      await expect(service.findUserByPhoneNumber(phoneNumber)).rejects.toThrow(
        `${phoneNumber} has more than one user linked to it!`
      );
      expect(phoneNumberUtils.getDisplayNumber).toHaveBeenCalledWith(
        phoneNumber
      );
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
    });
    it("should throw return null if no users found for given phone number", async () => {
      expect.assertions(3);
      mockFirstPage.mockReturnValue([]);
      const userRecord = await service.findUserByPhoneNumber(phoneNumber);
      expect(phoneNumberUtils.getDisplayNumber).toHaveBeenCalledWith(
        phoneNumber
      );
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
      expect(userRecord).toBe(null);
    });
    it("should search for users with formatted phone number", async () => {
      expect.assertions(4);
      mockFirstPage.mockReturnValue(records);
      const userRecord = await service.findUserByPhoneNumber(phoneNumber);
      expect(phoneNumberUtils.getDisplayNumber).toHaveBeenCalledWith(
        phoneNumber
      );
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
      expect(userRecord.fullName).toBe(fullName);
      expect(userRecord.phoneNumber).toBe(phoneNumber);
    });
  });
  describe("findUserByFullName", () => {
    it("should check is supplied argument is a string", async () => {
      expect.assertions(2);
      // noinspection JSCheckFunctionSignatures
      await expect(service.findUserByFullName()).rejects.toThrow(
        "Variable should be a String."
      );
      // noinspection JSCheckFunctionSignatures
      await expect(service.findUserByFullName(9)).rejects.toThrow(
        "Variable should be a String."
      );
    });
    const expectedFilterByFormula = `{Full Name} = '${fullName}'`;
    it("should throw error if more than one records are found for given full name", async () => {
      expect.assertions(2);
      mockFirstPage.mockReturnValue([records[0], records[1]]);
      await expect(service.findUserByFullName(fullName)).rejects.toThrow(
        `${fullName} has more than one user linked to it!`
      );
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
    });
    it("should throw return null if no users found for given full name", async () => {
      expect.assertions(2);
      mockFirstPage.mockReturnValue([]);
      const userRecord = await service.findUserByFullName(fullName);
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
      expect(userRecord).toBe(null);
    });
    it("should search for users with full name", async () => {
      expect.assertions(3);
      mockFirstPage.mockReturnValue(records);
      const userRecord = await service.findUserByFullName(fullName);
      expect(mockSelect).toHaveBeenCalledWith({
        view: mockUsersViewName,
        filterByFormula: expectedFilterByFormula,
      });
      expect(userRecord.fullName).toBe(fullName);
      expect(userRecord.phoneNumber).toBe(phoneNumber);
    });
  });
});
