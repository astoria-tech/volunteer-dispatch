const Slack = require('slack');
const token = process.env.SLACK_XOXB;
const channel = process.env.SLACK_CHANNEL_ID;
const bot = new Slack({ token });

// This function actually sends the message to the slack channel
const sendMessage = (errand, task, vols) => bot.chat
  .postMessage({
    token,
    channel,
    text: '',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':exclamation: *A new errand has been added!* :exclamation:',
        },
      },
      errand,
      task,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ' ',
        },
      },
    ],
    attachments: [
      {
        blocks: vols,
      },
    ],
  });

module.exports = {
  sendMessage
}