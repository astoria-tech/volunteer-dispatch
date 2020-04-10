const AirtableUtils = require("../src/airtable-utils");
const RequestRecord = require("../src/model/request-record");
const Task = require("../src/task");

describe("AirtableUtils", () => {
  describe("cloneRequestFieldsWithGivenTask", () => {
    it.each`
      request                                              | task         | expectedError
      ${undefined}                                         | ${undefined} | ${"Variable should be of type Object."}
      ${{ id: "kjhs8090" }}                                | ${undefined} | ${"Variable should be of type Object."}
      ${{}}                                                | ${undefined} | ${"Variable should be defined."}
      ${new RequestRecord({ id: "kjhs8090", fields: {} })} | ${undefined} | ${"Variable should be of type Object."}
    `(
      "should throw in case of invalid arguments",
      ({ request, task, expectedError }) => {
        expect(() =>
          AirtableUtils.cloneRequestFieldsWithGivenTask(request, task)
        ).toThrow(expectedError);
      }
    );
    it.each([
      new RequestRecord({ id: "kjhs8090", fields: {} }),
      new RequestRecord({ id: "kjhs8090", fields: { "Created time": "" } }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { "Created time": "2323434" },
      }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { "Created time": "", Error: "" },
      }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { "Created time": "2323434", Error: "" },
      }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { "Created time": "2323434", Error: "some error" },
      }),
    ])(
      "should return object without 'Created time' or 'Error fields",
      (request) => {
        const clonedRequest = AirtableUtils.cloneRequestFieldsWithGivenTask(
          request,
          Task.possibleTasks[0]
        );
        expect(clonedRequest.fields).not.toHaveProperty("Created time");
        expect(clonedRequest.fields).not.toHaveProperty("Error");
      }
    );
    it.each([
      new RequestRecord({ id: "kjhs8090", fields: {} }),
      new RequestRecord({ id: "kjhs8090", fields: { Tasks: undefined } }),
      new RequestRecord({ id: "kjhs8090", fields: { Tasks: "" } }),
      new RequestRecord({ id: "kjhs8090", fields: { Tasks: [] } }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { Tasks: [Task.possibleTasks[0]] },
      }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { Tasks: [Task.possibleTasks[1]] },
      }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { Tasks: Task.possibleTasks },
      }),
    ])("should replace 'Tasks' field with given task", (request) => {
      const task = Task.possibleTasks[0];
      const clonedRequest = AirtableUtils.cloneRequestFieldsWithGivenTask(
        request,
        task
      );
      expect(clonedRequest.fields).toHaveProperty("Tasks");
      expect(clonedRequest.fields.Tasks).toEqual([task.rawTask]);
    });
    it.each([
      new RequestRecord({ id: "kjhs8090", fields: {} }),
      new RequestRecord({ id: "kjhs8090", fields: { Name: "Severus Snape" } }),
      new RequestRecord({
        id: "kjhs8090",
        fields: { Name: "Severus Snape", City: "Astoria" },
      }),
    ])("should copy other fields from the original", (givenRequest) => {
      expect(
        AirtableUtils.cloneRequestFieldsWithGivenTask(
          givenRequest,
          Task.possibleTasks[0]
        ).fields
      ).toEqual(expect.objectContaining(givenRequest.rawFields));
    });
    it("should set the 'Cloned from' field with the request's id", () => {
      const id = "jsdhf9329";
      const request = new RequestRecord({ fields: {}, id });
      expect(
        AirtableUtils.cloneRequestFieldsWithGivenTask(
          request,
          Task.possibleTasks[0]
        ).fields["Cloned from"]
      ).toEqual([id]);
    });
  });
});
