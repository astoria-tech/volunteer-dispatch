require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const message = require("./message");
const { followUpButton } = require("./reminder");

const channel = config.SLACK_CHANNEL_ID;

// This function actually sends the message to the slack channel
const sendDispatch = async (
  record,
  volunteers,
  taskCounts,
  reminderBoolean = false
) => {
  if (!record) throw new Error("No record passed to sendMessage().");
  let text = "A new errand has been added";
  if (reminderBoolean) text = "Reminder for a previous request!";
  const heading = message.getHeading(text, reminderBoolean);
  const requester = message.getRequester(record);
  const tasks = message.getTasks(record);
  const requestedTimeframe = message.getTimeframe(record);
  const reminderButton = followUpButton;

  const res = await bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: [heading, requester, tasks, requestedTimeframe, reminderButton],
  });

  const subsidyRequested = message.getSubsidyRequest(record);
  const anythingElse = message.getAnythingElse(record);

  await bot.chat.postMessage({
    thread_ts: res.ts,
    token,
    channel,
    text,
    blocks: [subsidyRequested, anythingElse],
  });

  const volunteerHeading = message.getVolunteerHeading(volunteers);
  const volunteerList = message.getVolunteers(volunteers, taskCounts);
  const volunteerClosing = message.getVolunteerClosing(volunteers);

  await bot.chat.postMessage({
    thread_ts: res.ts,
    token,
    channel,
    text,
    blocks: [volunteerHeading, ...volunteerList, volunteerClosing],
  });

  const copyPasteNumbers = message.getCopyPasteNumbers(volunteers);

  return bot.chat.postMessage({
    thread_ts: res.ts,
    token,
    channel,
    text: copyPasteNumbers,
  });
};

module.exports = {
  sendDispatch,
};
