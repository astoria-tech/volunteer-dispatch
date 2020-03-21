const { GoogleSpreadsheet } = require('google-spreadsheet');
const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
const Slack = require('slack');
const Airtable = require('airtable');
require('dotenv').config();

// Geocoder
const ngcOptions = {
  //provider: 'google',
  //apiKey: process.env.GOOGLE_API_KEY,

  provider: 'mapquest',
  apiKey: process.env.MAPQUEST_KEY,

  httpAdapter: 'https',
  formatter: null,
};
const geocoder = NodeGeocoder(ngcOptions);

// Airtable
var base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appwgY1BPRGt1RBbE');

// Google Sheets
const errandDoc = new GoogleSpreadsheet(process.env.ERRAND_SHEET_ID);
const volunteerDoc = new GoogleSpreadsheet(process.env.VOLUNTEER_SHEET_ID);

// Slack
const token = process.env.SLACK_XOXB;
const channel = process.env.CHANNEL_ID;
const bot = new Slack({ token });

let size = 0;

// confirms service account has access to specified spreadsheet
async function googleAuth() {
  const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64').toString();

  await errandDoc.useServiceAccountAuth({
    // need to share doc with this email
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  });
  await volunteerDoc.useServiceAccountAuth({
    // need to share doc with this email
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  });
}

// this function is used for initial setup, need to get channel ID for message to send
async function listChannels() {
  console.log(await bot.channels.list());
}

// This function actually sends the message to the slack channel
async function sendMessage(errand, task, vols) {
  await bot.chat
    .postMessage({
      token,
      channel,
      text: '',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*A new errand has been added!*',
          },
        },
        errand,
        task,
      ],
      attachments: [
        {
          blocks: vols,
        },
      ],
    })
    .then((response) => console.log(response));
}

// Gets list of tasks from spreadsheet and adds to message text
function formatTasks(row) {
  let tasks = '';

  row.get('I need help with:').forEach((task) => {
    tasks += `\n :exclamation: *${task}*`;
  });

  return tasks;
}

// accepts an address and returns lat/long
function getCoords(address) {
  return new Promise((resolve) => {
    geocoder.geocode(address, (err, res) => {
      resolve({
        latitude: res[0].latitude,
        longitude: res[0].longitude,
      });
    });
  });
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
}

// accepts errand address and checks volunteer spreadsheet for closest volunteers
async function findClosestVol(address) {
  const recordsAndDistances = [];
  const metersToMiles = 0.000621371;
  const errandCoords = await getCoords(address);
  const allVolunteers = await base('Volunteers').select({ view: 'Grid view' }).firstPage();

  await asyncForEach(allVolunteers, async (record) => {
    const volunteerCoords = await getCoords(record.get('Full Street address (You can leave out your apartment/unit.)'));
    const distance = metersToMiles * geolib.getDistance(volunteerCoords, errandCoords);
    recordsAndDistances.push([record, distance]);
  });

  // Sort the volunteers by distance and grab the closest 5
  const closestVolunteers = recordsAndDistances.sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map((recordAndDistance) => {
      const [record, distance] = recordAndDistance;
      return {
        Name: record.get('Full Name'),
        Number: record.get('Please provide your contact phone number:'),
        Distance: distance,
      };
    });

  return closestVolunteers;
}

// This function is only for rounding number of decimal points for distance calc
// eslint-disable-next-line no-extend-native
Number.prototype.toFixedDown = (digits) => {
  const re = new RegExp(`(\\d+\\.\\d{${digits}})(\\d)`);
  const m = this.toString().match(re);
  return m ? parseFloat(m[1]) : this.valueOf();
};

// checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and
// executes slack message if new row has been detected
async function checkForNewSubmissions() {
  base('Submissions').select({ view: 'Grid view' }).firstPage(async (err, records) => {
    // Return if error
    if (err) { console.error(err); return; }

    // Look for records that have not been posted to slack yet
    records.forEach(async (record) => {
      if (record.get('Posted to Slack?') === 'yes') { return; }

      const errandObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${record.get('Name')}\n${
            record.get('Phone number')
          }\n${record.get('Address')}`,
        },
      };

      // Process the requested tasks
      const taskObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Needs assistance with the following task(s):${formatTasks(record)}`,
        },
      };

      // Find the closest volunteers
      const volunteers = await findClosestVol(record.get('Address'));
      const volObject = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Here are the 5 closest Volunteers*',
          },
        },
      ];

      volunteers.forEach((volunteer) => {
        volObject.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${volunteer.Name}, ${volunteer.Number} - ${volunteer.Distance.toFixed(2)} Mi.`,
          },
        });
      });

      // Post the message to Slack
      sendMessage(errandObject, taskObject, volObject);
      record.patchUpdate({ 'Posted to Slack?': 'yes' });
    });
  });
}

async function start() {
  try {
    // console.log(listChannels());
    checkForNewSubmissions();
    setInterval(checkForNewSubmissions, 15000);
  } catch (error) {
    console.log(error);
  }
}

start();
