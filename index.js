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
  provider: 'google',
  apiKey: process.env.GOOGLE_API_KEY,

  //provider: 'mapquest',
  //apiKey: process.env.MAPQUEST_KEY,

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
const channel = process.env.SLACK_CHANNEL_ID;
const bot = new Slack({ token });

// This function actually sends the message to the slack channel
function sendMessage(errand, task, vols) {
  return new Promise((resolve, reject) => {
    bot.chat
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
      }).then((response) => {
        if (response) {
          console.log(response);
          resolve();
        } else {
          reject(console.log('Message not sent.'));
        }
      }).catch((error) => console.log(error));
  });
}

// Gets list of tasks from spreadsheet and adds to message text
function formatTasks(row) {
  let formattedTasks = '';

  const tasks = row.get('Tasks');
  if (tasks) {
    formattedTasks = row.get('Tasks').reduce((msg, task) => `${msg}\n :small_orange_diamond: ${task}`, '');
  }

  return formattedTasks;
}


// Accepts an address and returns lat/long
function getCoords(address) {
  return new Promise((resolve,reject) => {
    geocoder.geocode(address, (err, res) => {
      if(err) reject(console.log(err));
      else{
        resolve({
          latitude: res[0].latitude,
          longitude: res[0].longitude,
        });
      }
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
  const tasks = request.get('Tasks') || [];
  let errandCoords;
  try {
    errandCoords = await getCoords(fullAddress(request));
  } catch (e) {
    /* handle error */
    console.log(e);
    return;
  }

  console.log(`Tasks: ${tasks}`);

  // Figure out which volunteers can fulfill at least one of the tasks
  try {
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
  } catch (e) {
    console.log(e);
  }

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

// Checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and
// executes slack message if new row has been detected
async function checkForNewSubmissions() {
  base('Requests').select({ view: 'Grid view' }).eachPage(async (records, nextPage) => {
    // Look for records that have not been posted to slack yet
    await asyncForEach(records, async (record) => {
      if (record.get('Posted to Slack?') === 'yes') { return; }
      log(`\nProcessing: ${record.get('Name')}`);

      // Prepare the general info
      const profileURL = `https://airtable.com/tblaL1g6IzH6uPclD/viwEjCF8PkEfQiLFC/${record.id}`;
      const header = [
        `<${profileURL}|${record.get('Name')}>`,
        record.get('Phone number'),
        record.get('Address'),
      ];
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
      const volObject = [];
      const volunteers = await findVolunteers(record);
      if (volunteers.length > 0) {
        // Header
        volObject.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Here are the 10 closest volunteers*',
          },
        });

        // Prepare the verbose volunteer info
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

        const msg = 'Here are the volunteer phone numbers for easy copy/pasting:';
        volObject.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [msg].concat(volunteers.map((v) => v.Number)).join('\n'),
          },
        });
      } else {
        // No volunteers found
        volObject.push({
          type: 'section',
          text: { type: 'mrkdwn', text: '*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*' },
        });
      }

      // Post the message to Slack
      sendMessage(errandObject, taskObject, volObject)
      .then(record.patchUpdate({
        'Posted to Slack?': 'yes',
        'Status': 'Needs assigning',
      })
        .then(console.log('Updated record!'))
        .catch((error) => console.log(error)))
      .catch((error) => console.log(error));
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
