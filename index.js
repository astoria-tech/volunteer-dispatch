require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

const NodeGeocoder = require('node-geocoder');

const geolib = require('geolib');

const ngcOptions = {
  provider: 'mapquest',
  httpAdapter: 'https',
  apiKey: process.env.MAPQUEST_KEY,
  formatter: null,
};
const geocoder = NodeGeocoder(ngcOptions);

const errandDoc = new GoogleSpreadsheet(process.env.ERRAND_SHEET_ID);
const volunteerDoc = new GoogleSpreadsheet(process.env.VOLUNTEER_SHEET_ID);
const token = process.env.SLACK_XOXB;
const Slack = require('slack');

const channel = process.env.CHANNEL_ID;

const bot = new Slack({ token });

let size = 0;

// confirms service account has access to specified spreadsheet
async function googleAuth() {
  await errandDoc.useServiceAccountAuth({
    // need to share doc with this email
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
  await volunteerDoc.useServiceAccountAuth({
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
    .then(response => console.log(response));
}

// Gets list of tasks from spreadsheet and adds to message text
function getTasks(row, heads) {
  // heads[4-11] are task fields
  let tasks = '';
  for (let i = 4; i < 12; i += 1) {
    if (row[heads[i]] !== '') {
      tasks += `\n :exclamation: *${heads[i]}*`;
    }
  }
  return tasks;
}
// accepts an address and returns lat/long
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
// accepts errand address and checks volunteer spreadsheet for closest volunteers
async function findClosestVol(address) {
  const volSheet = volunteerDoc.sheetsByIndex[0];
  const volRows = await volSheet.getRows();
  const vols = [];
  const metersToMiles = 0.000621371;
  for (let i = 0; i < volRows.length; i += 1) {
    const distance =
      metersToMiles *
      geolib.getDistance(
        await getCoords(volRows[i].Address),
        await getCoords(address)
      );
    vols.push([i, distance]);
  }
  vols.sort(function(a, b) {
    return a[1] - b[1];
  });
  const volunteers = {};
  for (let y = 0; y < 5; y += 1) {
    volunteers[y + 1] = {
      Name: volRows[vols[y][0]].Name,
      Number: volRows[vols[y][0]]['Phone Number'],
      Distance: vols[y][1],
    };
  }
  return volunteers;
}
// This function is only for rounding number of decimal points for distance calc
// eslint-disable-next-line no-extend-native
Number.prototype.toFixedDown = function(digits) {
  const re = new RegExp(`(\\d+\\.\\d{${digits}})(\\d)`);
  const m = this.toString().match(re);
  return m ? parseFloat(m[1]) : this.valueOf();
};

// checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and executes slack message if new row has been detected
async function checkRows(headers) {
  const errandSheet = errandDoc.sheetsByIndex[0];
  const errandRows = await errandSheet.getRows();

  const difference = errandRows.length - size;
  if (difference > 0) {
    for (let i = 0; i < difference; i += 1) {
      const errandObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${errandRows[size + i].Name}\n${
            errandRows[size + i]['Phone number']
          }\n${errandRows[size + i].Address}`,
        },
      };

      const taskObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Needs assistance with the following task(s):${getTasks(
            errandRows[size + i],
            headers
          )}`,
        },
      };
      const volunteers = await findClosestVol(errandRows[size + i].Address);
      const volObject = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Here are the 5 closest Volunteers*',
          },
        },
      ];

      for (let x = 0; x < Object.keys(volunteers).length; x += 1) {
        volObject.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${volunteers[1 + x].Name}, ${
              volunteers[1 + x].Number
            } - ${volunteers[1 + x].Distance.toFixedDown(2)} Mi.`,
          },
        });
      }
      sendMessage(errandObject, taskObject, volObject);
    }
    size = errandRows.length;
  } else {
    console.log('no change');
  }
}

// Initial check of spreadsheet, contains the setInterval which runs checkRows every 30 seconds
async function checkSheet() {
  const sheet = errandDoc.sheetsByIndex[0];
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
    await errandDoc.getInfo();
    await volunteerDoc.getInfo();
    await checkSheet();
  } catch (error) {
    console.log(error);
  }
}

start();
