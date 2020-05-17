const { when, resetAllWhenMocks } = require("jest-when");

jest.mock("../../src/geo");
jest.mock("../../src/utils/airtable-utils");
jest.mock("../../src/service/user-service");
const AirtableUtils = require("../../src/utils/airtable-utils");
const RequestRecord = require("../../src/model/request-record");
const Task = require("../../src/task");
const RequestService = require("../../src/service/request-service");
const UserService = require("../../src/service/user-service");
const UserRecord = require("../../src/model/user-record");

describe("RequestService", () => {
  let base;
  let service;
  let mockAirtableRequest;
  const mockAirtableGet = jest.fn();
  let userService;
  beforeEach(() => {
    base = { create: jest.fn(), update: jest.fn() };
    mockAirtableRequest = {
      id: "lkdjf8979",
      get: mockAirtableGet,
      fields: {},
    };
    const airtableUtils = new AirtableUtils(base);
    UserService.mockClear();
    userService = new UserService(base);
    service = new RequestService(base, airtableUtils, userService);
    resetAllWhenMocks();
  });
  describe("splitMultiTaskRequest", () => {
    it("should throw error if there is only 1 task", async () => {
      expect.assertions(3);
      when(mockAirtableGet).calledWith("Tasks").mockReturnValue(undefined);
      let request = new RequestRecord(mockAirtableRequest);
      await expect(service.splitMultiTaskRequest(request)).rejects.toThrow(
        "Illegal Argument."
      );
      when(mockAirtableGet).calledWith("Tasks").mockReturnValue([]);
      request = new RequestRecord(mockAirtableRequest);
      await expect(service.splitMultiTaskRequest(request)).rejects.toThrow(
        "Illegal Argument."
      );
      when(mockAirtableGet)
        .calledWith("Tasks")
        .mockReturnValue([Task.possibleTasks[0]]);
      request = new RequestRecord(mockAirtableRequest);
      await expect(service.splitMultiTaskRequest(request)).rejects.toThrow(
        "Illegal Argument."
      );
    });
    it("should try to create correct records", async () => {
      expect.assertions(1);
      mockAirtableRequest.fields.Tasks = [
        Task.possibleTasks[0],
        Task.possibleTasks[1],
      ];
      when(mockAirtableGet)
        .calledWith("Tasks")
        .mockReturnValue([Task.possibleTasks[0], Task.possibleTasks[1]]);
      const request = new RequestRecord(mockAirtableRequest);
      const newRecords = [
        { fields: { Tasks: Task.possibleTasks[0] } },
        { fields: { Tasks: Task.possibleTasks[1] } },
      ];
      AirtableUtils.cloneRequestFieldsWithGivenTask.mockReturnValueOnce(
        newRecords[0]
      );
      AirtableUtils.cloneRequestFieldsWithGivenTask.mockReturnValueOnce(
        newRecords[1]
      );
      await service.splitMultiTaskRequest(request);
      expect(base.create).toHaveBeenCalledWith([newRecords[0]]);
    });
  });
  describe("linkUserWithRequest", () => {
    const request = new RequestRecord();
    const userRecord = new UserRecord();
    const userId = "oiesr1212";
    let requestId;
    beforeEach(() => {
      requestId = mockAirtableRequest.id;
      jest.spyOn(request, "id", "get").mockReturnValue(requestId);
      jest.spyOn(userRecord, "id", "get").mockReturnValue(userId);
    });
    it("should throw error if both phone number and requester name are not present", async () => {
      expect.assertions(1);
      jest.spyOn(request, "phoneNumber", "get").mockReturnValue(undefined);
      jest.spyOn(request, "requesterName", "get").mockReturnValue(undefined);
      await expect(service.linkUserWithRequest(request)).rejects.toThrow(
        "Either phone number or requester's name should be present"
      );
    });
    const phoneNumber = "055.956.1902";
    const updatedField = { Requester: [userId] };
    it("should try to find user by phone number if present", async () => {
      expect.assertions(3);
      jest.spyOn(request, "phoneNumber", "get").mockReturnValue(phoneNumber);
      jest.spyOn(request, "requesterName", "get").mockReturnValue(undefined);
      when(userService.findUserByPhoneNumber)
        .expectCalledWith(phoneNumber)
        .mockResolvedValue(userRecord);
      await service.linkUserWithRequest(request);
      expect(userService.findUserByFullName).not.toHaveBeenCalled();
      expect(base.update).toHaveBeenCalledWith(
        requestId,
        updatedField,
        expect.any(Function)
      );
    });
    const fullName = "Ezekiel Adams";
    it("should try to find user by fullname if present", async () => {
      expect.assertions(3);
      jest.spyOn(request, "phoneNumber", "get").mockReturnValue(undefined);
      jest.spyOn(request, "requesterName", "get").mockReturnValue(fullName);
      when(userService.findUserByFullName)
        .expectCalledWith(fullName)
        .mockResolvedValue(userRecord);
      await service.linkUserWithRequest(request);
      expect(userService.findUserByPhoneNumber).not.toHaveBeenCalled();
      expect(base.update).toHaveBeenCalledWith(
        requestId,
        updatedField,
        expect.any(Function)
      );
    });
    it("should try to create a user if one is not found", async () => {
      expect.assertions(8);
      jest.spyOn(request, "phoneNumber", "get").mockReturnValue(phoneNumber);
      jest.spyOn(request, "requesterName", "get").mockReturnValue(fullName);
      when(userService.findUserByFullName)
        .expectCalledWith(fullName)
        .mockResolvedValue(null);
      when(userService.findUserByPhoneNumber)
        .expectCalledWith(phoneNumber)
        .mockResolvedValue(null);
      when(userService.createUser)
        .expectCalledWith(fullName, phoneNumber)
        .mockResolvedValue(userRecord);
      await service.linkUserWithRequest(request);
      expect(userService.findUserByPhoneNumber).toHaveBeenCalled();
      expect(userService.findUserByFullName).toHaveBeenCalled();
      expect(userService.createUser).toHaveBeenCalledWith(
        fullName,
        phoneNumber
      );
      expect(base.update).toHaveBeenCalledWith(
        requestId,
        updatedField,
        expect.any(Function)
      );
    });
  });
});
