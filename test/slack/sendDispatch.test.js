const { sendDispatch } = require("../../src/slack/sendDispatch");

const mockRequestRecord = {
  get(field) {
    return this.fields[field];
  },
  set(field, value) {
    return (this.fields[field] = value);
  },
  fields: {},
};

test("sendMessage() throws error when no requester record is passed", async () => {
  try {
    await sendDispatch();
  } catch (error) {
    expect(error.message).toMatch("No record passed to sendMessage().");
  }
});
