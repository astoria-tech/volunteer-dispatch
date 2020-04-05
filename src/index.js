const Airtable = require('airtable');
const Task = require('./task');
const table = require('./table');
const CustomAirtable = require('./custom-airtable');

const { sendMessage } = require('./slack');
const { getCoords, distanceBetweenCoords } = require('./geo');
require('dotenv').config();

/* System notes:
 * - Certain tasks should probably have an unmatchable requirement (because the tasks requires
 *   looking a shortlist of specialized volunteers)
 * - Airtable fields that start with '_' are system columns, not to be updated manually
 * - If the result seems weird, verify the addresses of the request/volunteers
*/

// Airtable
// eslint-disable-next-line max-len
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const customAirtable = new CustomAirtable(base);

function fullAddress(record) {
  return `${record.get('Address')} ${record.get('City')}, NY`;
}

// Accepts errand address and checks volunteer spreadsheet for closest volunteers
async function findVolunteers(request) {
  const volunteerDistances = [];

  const tasks = request.get('Tasks').map(Task.mapFromRawTask) || [];
  let errandCoords;
  try {
    errandCoords = await getCoords(fullAddress(request));
  } catch (e) {
    console.error(`Error getting coordinates for requester ${request.get('Name')} with error: ${JSON.stringify(e)}`);
    customAirtable.logErrorToTable(table.REQUESTS, request, e, 'getCoords');
    return [];
  }

  console.log(`Tasks: ${tasks.map((task) => task.rawTask).join(', ')}`);

  // Figure out which volunteers can fulfill at least one of the tasks
  await base(table.VOLUNTEERS).select({ view: 'Grid view' }).eachPage(async (volunteers, nextPage) => {
    // eslint-disable-next-line max-len
    const suitableVolunteers = volunteers.filter((volunteer) => tasks.some((task) => task.canBeFulfilledByVolunteer(volunteer)));

    // Calculate the distance to each volunteer
    for (const volunteer of suitableVolunteers) {
      const volAddress = volunteer.get('Full Street address (You can leave out your apartment/unit.)') || '';

      // Check if we need to retrieve the addresses coordinates
      // NOTE: We do this to prevent using up our free tier queries on Mapquest (15k/month)
      if (volAddress !== volunteer.get('_coordinates_address')) {
        let newVolCoords;
        try {
          newVolCoords = await getCoords(volAddress);
        } catch (e) {
          console.log('Unable to retrieve volunteer coordinates:', volunteer.get('Full Name'));
          customAirtable.logErrorToTable(table.VOLUNTEERS, volunteer, e, 'getCoords');
          // eslint-disable-next-line no-continue
          continue;
        }

        volunteer.patchUpdate({
          '_coordinates': JSON.stringify(newVolCoords),
          '_coordinates_address': volAddress,
        });
        volunteer.fetch();
      }

      // Try to get coordinates for this volunteer
      let volCoords;
      try {
        volCoords = JSON.parse(volunteer.get('_coordinates'));
      } catch (e) {
        console.log('Unable to parse volunteer coordinates:', volunteer.get('Full Name'));
        // eslint-disable-next-line no-continue
        continue;
      }

      // Calculate the distance
      const distance = distanceBetweenCoords(volCoords, errandCoords);
      volunteerDistances.push([volunteer, distance]);
    }

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

// Checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and
// executes slack message if new row has been detected
async function checkForNewSubmissions() {
  base(table.REQUESTS).select({ view: 'Grid view' }).eachPage(async (records, nextPage) => {
    // Remove records we don't want to process from the array.
    const cleanRecords = records.filter(r => {
      if (typeof r.get('Name') === 'undefined') return false;
      if (r.get('Posted to Slack?') === 'yes') return false;
      return true;
    });

    // Look for records that have not been posted to slack yet
    for (const record of cleanRecords) {
      console.log(`\nProcessing: ${record.get('Name')}`);

      // Find the closest volunteers
      const volunteers = await findVolunteers(record);

      // Send the message to Slack
      sendMessage(record, volunteers);

      await record
        .patchUpdate({
          'Posted to Slack?': 'yes',
          'Status': record.get('Status') || 'Needs assigning', // don't overwrite the status
        })
        .then(console.log('Updated record!'))
        .catch((error) => console.log(error));
    }

    nextPage();
  });
}

async function start() {
  try {
    console.log('\nVolunteer Dispatch started!');
    checkForNewSubmissions();
    setInterval(checkForNewSubmissions, 20000);
  } catch (error) {
    console.log(error);
  }
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

start();
