const { GoogleSpreadsheet } = require('google-spreadsheet');
const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
const Slack = require('slack');
const Airtable = require('airtable');
require('dotenv').config();

/* System notes:
 * - Certain tasks should probably have an unmatchable requirement (because the tasks requires
 *   looking a shortlist of specialized volunteers)
 * - Airtable fields that start with '_' are system columns, not to be updated manually
 * - If the result seems weird, verify the addresses of the request/volunteers
*/

// Geocoder
const ngcOptions = {
  // provider: 'google',
  // apiKey: process.env.GOOGLE_API_KEY,

  provider: 'mapquest',
  apiKey: process.env.MAPQUEST_KEY,

  httpAdapter: 'https',
  formatter: null,
};
const geocoder = NodeGeocoder(ngcOptions);

// Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appwgY1BPRGt1RBbE');

// Google Sheets
const errandDoc = new GoogleSpreadsheet(process.env.ERRAND_SHEET_ID);
const volunteerDoc = new GoogleSpreadsheet(process.env.VOLUNTEER_SHEET_ID);

// Slack
const token = process.env.SLACK_XOXB;
const channel = process.env.CHANNEL_ID;
const bot = new Slack({ token });

// Confirms service account has access to specified spreadsheet
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

// This function is used for initial setup, need to get channel ID for message to send
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
    })
    .then((response) => console.log(response));
}

// Gets list of tasks from spreadsheet and adds to message text
function formatTasks(row) {
  return row.get('Tasks').reduce((msg, task) => `${msg}\n :small_orange_diamond: ${task}`, '');
}

// Accepts an address and returns lat/long
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


const ERRAND_REQUIREMENTS = {
  'Grocery shopping': [
    'Picking up groceries/prescriptions',
    'Picking up groceries/medications - For this option',
    'Running errands for vulnerable neighbors',
  ],
  'Picking up a prescription': [
    'Picking up groceries/medications',
    'Picking up groceries/medications - For this option',
    'Running errands for vulnerable neighbors',
  ],
  'Transportation to/from a medical appointment': [
    'Transportation',
    'Transportation (By selecting this option you are affirming that you have a valid drivers license and valid vehicular insurance through May 2020)',
  ],
  'Dog walking': [
    'Pet-sitting/walking/feeding',
  ],
  'Loneliness': [
    'Check-in on folks throughout the day (in-person or phone call)',
    'Checking in on people',
  ],
  'Accessing verified health information': [
    'Check-in on folks throughout the day (in-person or phone call)',
    'Checking in on people',
    'Navigating the health care/insurance websites',
  ],
  'Other': [],
};

function log(s) {
  console.log('\x1b[33m%s\x1b[0m', s);
}

function fullAddress(record) {
  return `${record.get('Address')} ${record.get('City')}, NY`;
}

// Accepts errand address and checks volunteer spreadsheet for closest volunteers
async function findVolunteers(request) {
  const volunteerDistances = [];
  const metersToMiles = 0.000621371;
  const tasks = request.get('Tasks');
  const errandCoords = await getCoords(fullAddress(request));
  console.log(`Tasks: ${tasks}`);

  // Figure out which volunteers can fulfill at least one of the tasks
  await base('Volunteers (real)').select({ view: 'Grid view' }).eachPage(async (volunteers, nextPage) => {
    const suitableVolunteers = volunteers.filter((volunteer) => {
      const capabilities = volunteer.get('I can provide the following support (non-binding)') || [];

      // console.log(`\nChecking ${volunteer.get('Full Name')}`);
      // console.log(capabilities);

      // Figure out which tasks this volunteer can handle
      const handleableTasks = [];
      for (let i = 0; i < tasks.length; i += 1) {
        // If the beginning of any capability matches the requirement,
        // the volunteer can handle the task
        const requirements = ERRAND_REQUIREMENTS[tasks[i]];
        const canHandleTask = requirements.some((r) => capabilities.some((c) => c.startsWith(r)));

        // Filter out this volunteer if they can't handle the task
        // console.log(`${volunteer.get('Full Name')} can handle ${tasks[i]}? ${canHandleTask}`);
        if (canHandleTask) {
          handleableTasks.push(tasks[i]);
        }
      }

      return handleableTasks.length > 0;
    });

    // Calculate the distance to each volunteer
    await asyncForEach(suitableVolunteers, async (volunteer) => {
      const volAddress = volunteer.get('Full Street address (You can leave out your apartment/unit.)') || '';

      // Check if we need to retrieve the addresses coordinates
      // NOTE: We do this to prevent using up our free tier queries on Mapquest (15k/month)
      if (volAddress !== volunteer.get('_coordinates_address')) {
        volunteer.set('_coordinates', JSON.stringify(await getCoords(volAddress)));
        volunteer.set('_coordinates_address', volAddress);
        volunteer.save();
      }
      const volCoords = JSON.parse(volunteer.get('_coordinates'));

      // Calculate the distance
      const distance = metersToMiles * geolib.getDistance(volCoords, errandCoords);
      volunteerDistances.push([volunteer, distance]);
    });

    nextPage();
  });

  // Sort the volunteers by distance and grab the closest 10
  const closestVolunteers = volunteerDistances.sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map((volunteerAndDistance) => {
      const [volunteer, distance] = volunteerAndDistance;
      return {
        Name: volunteer.get('Full Name'),
        Number: volunteer.get('Please provide your contact phone number:'),
        Distance: distance,
        record: volunteer,
      };
    });

  console.log('Closest:');
  closestVolunteers.forEach((v) => {
    console.log(v.Name, v.Distance.toFixed(2), 'Mi');
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

// Checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and
// executes slack message if new row has been detected
async function checkForNewSubmissions() {
  base('Requests').select({ view: 'Grid view' }).eachPage(async (records, nextPage) => {
    // Look for records that have not been posted to slack yet
    await asyncForEach(records, async (record) => {
      if (record.get('Posted to Slack?') === 'yes') { return; }
      log(`\nProcessing: ${record.get('Name')}`);

      // Prepare the general info
      const profileURL = `https://airtable.com/tblaL1g6IzH6uPclD/viwEjCF8PkEfQiLFC/${record.id}`
      const header = [
        `<${profileURL}|${record.get('Name')}>`,
        record.get('Phone number'),
        record.get('Address'),
      ]
      const errandObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: header.join('\n'),
        },
      };

      // Process the requested tasks
      const taskObject = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Needs assistance with:*${formatTasks(record)}`,
        },
      };

      // Find the closest volunteers
      const volunteers = await findVolunteers(record);
      const volObject = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Here are the 10 closest volunteers*',
          },
        },
      ];

      volunteers.forEach((volunteer) => {
        const volunteerURL = `https://airtable.com/tblxqtMAabmJyl98c/viwNYMdylPukGiOYQ/${volunteer.record.id}`;
        volObject.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<${volunteerURL}|${volunteer.Name}> - ${volunteer.Number} - ${volunteer.Distance.toFixed(2)} Mi.`,
          },
        });
      });

      // Post the message to Slack
      sendMessage(errandObject, taskObject, volObject);
      record.patchUpdate({
        'Posted to Slack?': 'yes',
        'Status': 'Needs to be assigned',
      });
    });

    nextPage();
  });
}

async function start() {
  try {
    checkForNewSubmissions();
    setInterval(checkForNewSubmissions, 15000);
  } catch (error) {
    console.log(error);
  }
}

start();
