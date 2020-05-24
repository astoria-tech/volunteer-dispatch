/* eslint-disable max-len */
/* To allow test case table to pass linting */

const AirtableUtils = require("../src/airtable-utils");
const RequestRecord = require("../src/model/request-record");
const Task = require("../src/task");

describe("AirtableUtils", () => {
  describe("cloneRequestFieldsWithGivenTask", () => {
    const taskOrder = "1 of 3";
    it.each`
      request                                              | task         | order        | expectedError
      ${undefined}                                         | ${undefined} | ${taskOrder} | ${"Variable should be of type Object."}
      ${{ id: "kjhs8090" }}                                | ${undefined} | ${taskOrder} | ${"Variable should be of type Object."}
      ${{}}                                                | ${undefined} | ${taskOrder} | ${"Variable should be defined."}
      ${new RequestRecord({ id: "kjhs8090", fields: {} })} | ${undefined} | ${taskOrder} | ${"Variable should be of type Object."}
      ${new RequestRecord({ id: "kjhs8090", fields: {} })} | ${undefined} | ${taskOrder} | ${"Variable should be of type Object."}
      ${new RequestRecord({ id: "kjhs8090", fields: {} })} | ${{}}        | ${undefined} | ${"Variable should be a String."}
    `(
      "should throw in case of invalid arguments",
      ({ request, task, order, expectedError }) => {
        expect(() =>
          AirtableUtils.cloneRequestFieldsWithGivenTask(request, task, order)
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
          Task.possibleTasks[0],
          taskOrder
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
        task,
        taskOrder
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
          Task.possibleTasks[0],
          taskOrder
        ).fields
      ).toEqual(expect.objectContaining(givenRequest.rawFields));
    });
    it("should set the 'Cloned from' field with the request's id", () => {
      const id = "jsdhf9329";
      const request = new RequestRecord({ fields: {}, id });
      expect(
        AirtableUtils.cloneRequestFieldsWithGivenTask(
          request,
          Task.possibleTasks[0],
          "1 of 3"
        ).fields["Cloned from"]
      ).toEqual([id]);
    });
    it("should set the 'Task Order' field with the task order string", () => {
      const id = "jsdhf9329";
      const request = new RequestRecord({ fields: {}, id });
      expect(
        AirtableUtils.cloneRequestFieldsWithGivenTask(
          request,
          Task.possibleTasks[0],
          taskOrder
        ).fields["Task Order"]
      ).toEqual(taskOrder);
    });
  });
});
