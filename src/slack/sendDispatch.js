require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const message = require("./message");
const { followUpButton } = require("./reminder");

const channel = config.SLACK_CHANNEL_ID;

const sendPrimaryRequestInfo = async (record, text, reminder) => {
  const heading = message.getHeading({ reminder, text });
  const requester = message.getRequester(record);
  const tasks = message.getTasks(record);
  const requestedTimeframe = message.getTimeframe(record);

  const res = await bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: [heading, requester, tasks, requestedTimeframe, followUpButton],
  });

  return res;
};

const sendSecondaryRequestInfo = async (record, text, thread_ts) => {
  const subsidyRequested = message.getSubsidyRequest(record);
  const anythingElse = message.getAnythingElse(record);

  await bot.chat.postMessage({
    thread_ts,
    token,
    channel,
    text,
    blocks: [subsidyRequested, anythingElse],
  });

  return;
};

const sendVolunteerInfo = async (volunteers, taskCounts, text, thread_ts) => {
  const volunteerHeading = message.getVolunteerHeading(volunteers);
  const volunteerList = message.getVolunteers(volunteers, taskCounts);
  const volunteerClosing = message.getVolunteerClosing(volunteers);

  await bot.chat.postMessage({
    thread_ts,
    token,
    channel,
    text,
    blocks: [volunteerHeading, ...volunteerList, volunteerClosing],
  });

  return;
};

const sendCopyPasteNumbers = async (volunteers, thread_ts) => {
  const copyPasteNumbers = message.getCopyPasteNumbers(volunteers);

  await bot.chat.postMessage({
    thread_ts,
    token,
    channel,
    text: copyPasteNumbers,
  });

  return;
};

const sendDispatch = async (
  record,
  volunteers,
  taskCounts,
  reminder = false
) => {
  if (!record) throw new Error("No record passed to sendMessage().");

  const text = message.getText({ reminder });
  const { ts } = await sendPrimaryRequestInfo(record, text, reminder);
  await sendSecondaryRequestInfo(record, text, ts);
  await sendVolunteerInfo(volunteers, taskCounts, text, ts);
  await sendCopyPasteNumbers(volunteers, ts);

  return;
};

module.exports = {
  sendDispatch,
};
