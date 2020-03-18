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

function getTasks(row, heads) {
  // heads[4-11] are task fields
  let tasks = '';
  for (let i = 4; i < 12; i += 1) {
    if (row[heads[i]] !== '') {
      tasks += `\n${heads[i]}`;
    }
  }
  return tasks;
}

async function loadSheet() {
  await doc.getInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const headers = sheet.headerValues;
  const txt = `
  A new Errand has been added.

  ${rows[0].Name}  
  ${rows[0]['Phone number']}
  ${rows[0].Address} 
  needs assistance with the following tasks:
  ${getTasks(rows[0], headers)}
  `;

  sendMessage(txt);
}

async function start() {
  try {
    googleAuth();
    await loadSheet();
  } catch (error) {
    console.log(error);
  }
}

start();
