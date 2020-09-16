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
 * @returns {object} Block to send to slack.
 */
const getPrimaryRequestInfoBlock = (record, text, reminder) => {
  const heading = message.getHeading({ reminder, text });
  const taskOrder = message.getTaskOrder(record);
  const requester = message.getRequester(record);
  const tasks = message.getTasks(record);
  const requestedTimeframe = message.getTimeframe(record);
  return taskOrder
    ? [heading, taskOrder, requester, tasks, requestedTimeframe, followUpButton]
    : [heading, requester, tasks, requestedTimeframe, followUpButton];
};

/**
 * Send secondary request info.
 *
 * @param {object} record The request record object.
 * @returns {object} Block to send to slack.
 */
const getSecondaryRequestInfoBlock = (record) => {
  const subsidyRequested = message.getSubsidyRequest(record);
  const anythingElse = message.getAnythingElse(record);

  return [subsidyRequested, anythingElse];
};

/**
 * Send volunteer info.
 *
 * @param {Array} volunteers The list of identified volunteers.
 * @returns {object} Block to send to slack.
 */
const getVolunteerInfoBlock = (volunteers) => {
  const volunteerHeading = message.getVolunteerHeading(volunteers);
  const volunteerList = message.getVolunteers(volunteers);
  const volunteerClosing = message.getVolunteerClosing(volunteers);

  return [volunteerHeading, ...volunteerList, volunteerClosing];
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
 * @param {boolean} [reminder] Whether this is a reminder task. Defaults to false.
 * @throws {Error} If no record is provided.
 * @returns {void}
 */
const sendDispatch = async (record, volunteers, reminder = false) => {
  if (!record) throw new Error("No record passed to sendMessage().");

  const text = message.getText({ reminder });
  const primaryRequestInfo = getPrimaryRequestInfoBlock(record, text, reminder);
  const blocksList = [
    getSecondaryRequestInfoBlock(record),
    getVolunteerInfoBlock(volunteers),
  ];
  const res = await bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: primaryRequestInfo,
  });
  const { ts } = res;
  for (const blocks of blocksList) {
    await bot.chat.postMessage({
      thread_ts: ts,
      token,
      channel,
      text,
      blocks,
    });
  }
  await sendCopyPasteNumbers(volunteers, ts);
};

module.exports = {
  sendDispatch,
};
