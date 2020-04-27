const { sendDispatch } = require("../../src/slack/sendDispatch");

test("sendMessage() throws error when no requester record is passed", async () => {
  await expect(sendDispatch()).rejects.toThrow(
    "No record passed to sendMessage()."
  );
});
