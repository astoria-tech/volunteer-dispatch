require("dotenv").config();
const config = require("../config");
const { getSection, bot, token } = require("./");
const channel = config.SLACK_ALERT_CHANNEL_ID;

let prevErrorMessage = "";
let prevStackTrace = "";
let thread_ts = "";

// For use by SlackErrorTranport in winston
const sendAlert = async (error) => {
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
    thread_ts = res.ts;
  } else {
    // Handle repeats
    const repeatMessage = getSection(":repeat: :fire: Error repeated.");
    const space = getSection(" ");

    await bot.chat.postMessage({
      thread_ts,
      token,
      channel,
      text: "Uh oh! Something's wrong.",
      blocks: [repeatMessage, space],
    });
  }
};

module.exports = {
  sendAlert,
};
