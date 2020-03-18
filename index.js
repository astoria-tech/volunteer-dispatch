require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

const NodeGeocoder = require('node-geocoder');

const ngcOptions = {
  provider: 'mapquest',
  httpAdapter: 'https',
  apiKey: process.env.MAPQUEST_KEY,
  formatter: null,
};
const geocoder = NodeGeocoder(ngcOptions);

const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
const token = process.env.SLACK_XOXB;
const Slack = require('slack');

const channel = process.env.CHANNEL_ID;

const bot = new Slack({ token });

let size = 0;

// confirms service account has access to specified spreadsheet
async function googleAuth() {
  await doc.useServiceAccountAuth({
    // need to share doc with this email
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
}

// this function is used for initial setup, need to get channel ID for message to send
async function listChannels() {
  console.log(await bot.channels.list());
}

// This function actually sends the message to the slack channel
async function sendMessage(message) {
  await bot.chat
    .postMessage({
      token,
      channel,
      text: message,
    })
    .then(response => console.log(response));
}

// Gets list of tasks from spreadsheet and adds to message text
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

// checks for updates on spreadsheet and executes slack message if new row has been detected
async function checkRows(headers) {
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const difference = rows.length - size;
  if (difference > 0) {
    for (let i = 0; i < difference; i += 1) {
      const txt = `
        A new Errand has been added.
      
        ${rows[size + i].Name}
        ${rows[size + i]['Phone number']}
        ${rows[size + i].Address}
        needs assistance with the following tasks:
        ${getTasks(rows[size + i], headers)}
        `;

      sendMessage(txt);
    }
    size = rows.length;
  } else {
    console.log('no change');
  }
}

// Initial check of spreadsheet, contains the setInterval which runs checkRows every 30 seconds
async function checkSheet() {
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const headers = sheet.headerValues;
  size = rows.length;

  setInterval(() => {
    checkRows(headers);
  }, 30000);
}

// start function. Runs google authentication, gets basic doc info and then runs check sheet
async function start() {
  try {
    googleAuth();
    await doc.getInfo();
    await checkSheet();
  } catch (error) {
    console.log(error);
  }
}
function getCoords(address) {
  return new Promise((resolve, reject) => {
    geocoder.geocode(address, (err, res) =>
      resolve({
        latitude: res[0].latitude,
        longitude: res[0].longitude,
      })
    );
  });
}
start();
