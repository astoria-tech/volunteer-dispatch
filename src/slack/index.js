require("dotenv").config();
const Slack = require("slack");

const config = require("../config");

const token = config.SLACK_TOKEN;
const bot = new Slack({ token });

const getSection = (text) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

module.exports = {
  bot,
  getSection,
};
