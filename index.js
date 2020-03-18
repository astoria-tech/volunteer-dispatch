require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
const token = process.env.SLACK_XOXB;
const Slack = require('slack');

const channel = process.env.CHANNEL_ID;

const bot = new Slack({ token });

async function googleAuth() {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, // need to share doc with this email
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
  return 'doc.loadInfo()';
}

async function listChannels() {
  console.log(await bot.channels.list());
}

async function sendMessage(message) {
  await bot.chat
    .postMessage({
      token,
      channel,
      text: message,
    })
    .then(response => console.log(response));
}
try {
  sendMessage(googleAuth());
} catch (error) {
  console.log(error);
}
