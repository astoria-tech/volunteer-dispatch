require("dotenv").config();
const config = require("../config");
const { bot } = require("./");

const token = config.SLACK_TOKEN;
const channel = config.SLACK_ALERT_CHANNEL_ID;

const sendAlert = (error) => {
  bot.chat.postMessage({
    token,
    channel,
    text: "Uh oh! Something's wrong.",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "We've got an issue.",
        },
      },
    ],
  });
};

module.exports = {
  sendAlert,
};
