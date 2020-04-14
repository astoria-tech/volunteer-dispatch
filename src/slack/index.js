require("dotenv").config();
const crypto = require("crypto");
const qs = require("qs");

const Slack = require("slack");
const config = require("../config");

const slackSecret = config.SLACK_SECRET;
const token = config.SLACK_TOKEN;
const bot = new Slack({ token });

const getSection = (text) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

const slackConf = (req) => {
  const reqBody = qs.stringify(req.body, { format: "RFC1738" });
  const timeStamp = req.headers["x-slack-request-timestamp"];
  const slackSig = req.headers["x-slack-signature"];
  if (Math.abs(Math.floor(Date.now() / 1000) - timeStamp) > 300) {
    return false;
  }
  const baseString = `v0:${timeStamp}:${reqBody}`;
  const mySecret = `v0=${crypto
    .createHmac("sha256", slackSecret)
    .update(baseString)
    .digest("hex")}`;

  if (
    crypto.timingSafeEqual(
      Buffer.from(mySecret, "utf8"),
      Buffer.from(slackSig, "utf8")
    )
  ) {
    return true;
  }
  return false;
};

module.exports = {
  bot,
  token,
  getSection,
  slackConf,
};
