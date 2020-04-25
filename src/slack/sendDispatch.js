require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const message = require("./message");
const { followUpButton } = require("./reminder");

const channel = config.SLACK_CHANNEL_ID;

/**
 * Send the primary request info.
 *
 * @param {object} record The request record object.
 * @param {string} text The message to send to slack.
 * @param {boolean} reminder The reminder object.
 * @returns {object} The slack post object sent.
 */
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

/**
 * Send secondary request info.
 *
 * @param {object} record The request record object.
 * @param {string} text The message to send to slack.
 * @param {string} threadTs The message threads object returned from slack.
 * @returns {object} The slack chat message object sent.
 */
const sendSecondaryRequestInfo = async (record, text, threadTs) => {
  const subsidyRequested = message.getSubsidyRequest(record);
  const anythingElse = message.getAnythingElse(record);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text,
    blocks: [subsidyRequested, anythingElse],
  });
};

/**
 * Send volunteer info.
 *
 * @param {Array} volunteers The list of identified volunteers.
 * @param {Map} taskCounts Map of volunteers to the amount of assigned tasks.
 * @param {string} text The message to send to slack.
 * @param {string} threadTs The threaded message object returned from slack.
 * @returns {object} The slack chat message object sent.
 */
const sendVolunteerInfo = async (volunteers, taskCounts, text, threadTs) => {
  const volunteerHeading = message.getVolunteerHeading(volunteers);
  const volunteerList = message.getVolunteers(volunteers, taskCounts);
  const volunteerClosing = message.getVolunteerClosing(volunteers);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text,
    blocks: [volunteerHeading, ...volunteerList, volunteerClosing],
  });
};

/**
 * Send copy and paste numbers.
 *
 * @param {Array} volunteers The list of selected volunteers.
 * @param {string} threadTs The threaded message object returned from slack.
 * @returns {object} The slack chat message object sent.
 */
const sendCopyPasteNumbers = async (volunteers, threadTs) => {
  const copyPasteNumbers = message.getCopyPasteNumbers(volunteers);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text: copyPasteNumbers,
  });
};

/**
 * This function actually sends the message to the slack channel.
 *
 * @param {object} record The Airtable record to use.
 * @param {Array} volunteers The volunteer list selected.
 * @param {Map} taskCounts Volunteers mapped to the amount of tasks they're already assigned.
 * @param {boolean} [reminder] Whether this is a reminder task. Defaults to false.
 * @throws {Error} If no record is provided.
 * @returns {void}
 */
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
};

module.exports = {
  sendDispatch,
};
