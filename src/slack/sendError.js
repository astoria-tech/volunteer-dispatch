require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const { getSection } = require("./message");

const channel = config.SLACK_ALERT_CHANNEL_ID;

let prevErrorMessage = "";
let prevStackTrace = "";
let threadTs = "";

/**
 * For use by SlackErrorTranport in winston logger.
 *
 * @param {object} error The error object.
 * @returns {void}
 */
const sendError = async (error) => {
  // Exit if no slack alert channel is provided
  if (!channel) return;

  // For new errors (i.e., not the same error as the previous one)
  if (error.message !== prevErrorMessage && error.stack !== prevStackTrace) {
    const errorMessage = getSection(`:fire: *${error.message}* :fire:\n\n`);
    const space = getSection(" ");
    const stackTrace = getSection(error.stack);

    const res = await bot.chat.postMessage({
      token,
      channel,
      text: "Uh oh! Something's wrong.",
      blocks: [errorMessage, space],
      attachments: [
        {
          blocks: [stackTrace],
        },
      ],
    });

    // Set previous message info for comparison
    prevErrorMessage = error.message;
    prevStackTrace = error.stack;
    threadTs = res.ts;
  } else if (!!prevErrorMessage && !!prevStackTrace && !!threadTs) {
    // Handle repeats
    const repeatMessage = getSection(":repeat: :fire: Error repeated.");
    const space = getSection(" ");

    await bot.chat.postMessage({
      thread_ts: threadTs,
      token,
      channel,
      text: "Uh oh! Something's wrong.",
      blocks: [repeatMessage, space],
    });
  } else {
    // A block just in case an error isn't handled by the above
    const errorMessage = getSection(`:fire: *${error.message}* :fire:\n\n`);
    const space = getSection(" ");
    const stackTrace = getSection(error.stack);

    await bot.chat.postMessage({
      token,
      channel,
      text: "Uh oh! Something's wrong.",
      blocks: [errorMessage, space],
      attachments: [
        {
          blocks: [stackTrace],
        },
      ],
    });
  }
};

module.exports = {
  sendError,
};
