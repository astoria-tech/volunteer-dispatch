const { when } = require("jest-when");

jest.mock("../../src/geo");
jest.mock("../../src/airtable-utils");
const AirtableUtils = require("../../src/airtable-utils");
const RequestRecord = require("../../src/model/request-record");
const Task = require("../../src/task");
const RequestService = require("../../src/service/request-service");

describe("RequestService", () => {
  let base;
  let service;
  let mockAirtableRequest;
  const mockAirtableGet = jest.fn();
  beforeEach(() => {
    base = { create: jest.fn(), update: jest.fn() };
    mockAirtableRequest = {
      id: "lkdjf8979",
      get: mockAirtableGet,
      fields: {},
    };
    service = new RequestService(base);
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
});
