const Airtable = require("airtable");

const Task = require("./task");
const config = require("./config");
const AirtableUtils = require("./airtable-utils");
const http = require("./http");
const { getCoords, distanceBetweenCoords } = require("./geo");
const { logger } = require("./logger");
const Request = require("./model/request-record");
const RequestService = require("./service/request-service");
const VolunteerService = require("./service/volunteer-service");

const { sendDispatch } = require("./slack/sendDispatch");
require("dotenv").config();

/* System notes:
 * - Certain tasks should probably have an unmatchable requirement (because the tasks requires
 *   looking a shortlist of specialized volunteers)
 * - Airtable fields that start with '_' are system columns, not to be updated manually
 * - If the result seems weird, verify the addresses of the request/volunteers
 */

// Airtable
const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);
const customAirtable = new AirtableUtils(base);
const requestService = new RequestService(
  base(config.AIRTABLE_REQUESTS_TABLE_NAME),
  customAirtable
);
const volunteerService = new VolunteerService(
  base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
);

/**
 * Fetch volunteers and return custom fields.
 *
 * @param {Array} volunteerAndDistance An array with volunteer record on the 0th index and its
 * distance from requester on the 1st index
 * @returns {{Number: *, record: *, Distance: *, Name: *}} Custom volunteer fields.
 */
function volunteerWithCustomFields(volunteerAndDistance) {
  const [volunteer, distance] = volunteerAndDistance;
  return {
    Name: volunteer.get("Full Name"),
    Number: volunteer.get("Please provide your contact phone number:"),
    Distance: distance,
    record: volunteer,
    Id: volunteer.id,
  };
}

// Accepts errand address and checks volunteer spreadsheet for closest volunteers
/**
 * Find volunteers.
 *
 * @param {object} request The Airtable request object.
 * @returns {Array} An array of objects of the closest volunteers to the request,
 * or an empty array if none are found.
 */
async function findVolunteers(request) {
  const { tasks } = request;
  if (tasks && tasks.length > 0 && tasks[0].equals(Task.LONELINESS)) {
    return (await volunteerService.findVolunteersForLoneliness())
      .map((v) => [v, "N/A"])
      .map(volunteerWithCustomFields);
  }

  let errandCoords;
  try {
    errandCoords = request.coordinates;
  } catch (e) {
    logger.error(
      `Unable to parse coordinates for request ${request.id} from ${request.name}`
    );
    return [];
  }
  logger.info(`Tasks: ${tasks.map((task) => task.rawTask).join(", ")}`);

  const volunteerDistances = [];
  // Figure out which volunteers can fulfill at least one of the tasks
  await base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
      filterByFormula: "{Account Disabled} != TRUE()",
    })
    .eachPage(async (volunteers, nextPage) => {
      const suitableVolunteers = volunteers.filter((volunteer) =>
        tasks.some((task) => task.canBeFulfilledByVolunteer(volunteer))
      );

      // Calculate the distance to each volunteer
      for (const volunteer of suitableVolunteers) {
        const volAddress =
          volunteer.get(
            "Full Street address (You can leave out your apartment/unit.)"
          ) || "";

        // Check if we need to retrieve the addresses coordinates
        // NOTE: We do this to prevent using up our free tier queries on Mapquest (15k/month)
        if (volAddress !== volunteer.get("_coordinates_address")) {
          let newVolCoords;
          try {
            newVolCoords = await getCoords(volAddress);
          } catch (e) {
            logger.info(
              "Unable to retrieve volunteer coordinates:",
              volunteer.get("Full Name")
            );
            customAirtable.logErrorToTable(
              config.AIRTABLE_VOLUNTEERS_TABLE_NAME,
              volunteer,
              e,
              "getCoords"
            );
            continue;
          }

          volunteer.patchUpdate({
            _coordinates: JSON.stringify(newVolCoords),
            _coordinates_address: volAddress,
          });
          volunteer.fetch();
        }

        // Try to get coordinates for this volunteer
        let volCoords;
        try {
          volCoords = JSON.parse(volunteer.get("_coordinates"));
        } catch (e) {
          logger.info(
            "Unable to parse volunteer coordinates:",
            volunteer.get("Full Name")
          );
          continue;
        }

        // Calculate the distance
        const distance = distanceBetweenCoords(volCoords, errandCoords);
        volunteerDistances.push([volunteer, distance]);
      }

      nextPage();
    });

  // Sort the volunteers by distance and grab the closest 10
  const closestVolunteers = volunteerDistances
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(volunteerWithCustomFields);

  logger.info("Closest:");
  closestVolunteers.forEach((v) => {
    logger.info(`${v.Name} ${v.Distance.toFixed(2)} Mi`);
  });

  return closestVolunteers;
}

/**
 * Checks for updates on errand spreadsheet, finds closest volunteers from volunteer
 * spreadsheet and executes slack message if new row has been detected or if the row's reminder
 * date/time has passed
 *
 * @returns {void}
 */
async function checkForNewSubmissions() {
  base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_REQUESTS_VIEW_NAME,
      filterByFormula: `
        AND(
          {Was split?} != 'yes', 
          {Name} != '', 
          OR(      
            {Posted to Slack?} != 'yes',
            AND(
              {Posted to Slack?} = 'yes',
              {Reminder Posted} != 'yes',      
              AND(
                {Reminder Date/Time} != '',
                {Reminder Date/Time} < ${Date.now()}
              )
            )
          )
        )`,
    })
    .eachPage(async (records, nextPage) => {
      const mappedRecords = records.map((r) => new Request(r));

      // Get the amount of tasks assigned to each volunteer
      const volunteerTaskCounts = await requestService.getVolunteerTaskCounts();

      // Look for records that have not been posted to slack yet
      for (const record of mappedRecords) {
        let requestWithCoords;
        try {
          requestWithCoords = await requestService.resolveAndUpdateCoords(
            record
          );
        } catch (e) {
          logger.error(
            `Error resolving and updating coordinates of request ${record.id} of ${record.name}`
          );
          continue;
        }
        if (requestWithCoords.tasks.length > 1) {
          // noinspection ES6MissingAwait
          requestService.splitMultiTaskRequest(requestWithCoords);
          continue;
        }

        logger.info(`New help request for: ${requestWithCoords.get("Name")}`);

        // Find the closest volunteers
        const volunteers = await findVolunteers(requestWithCoords);

        // Send the message to Slack
        let messageSent = false;
        let reminder = false;

        try {
          if (
            Date.now() > record.get("Reminder Date/Time") &&
            record.get("Posted to Slack?") === "yes"
          ) {
            await sendDispatch(
              requestWithCoords,
              volunteers,
              volunteerTaskCounts,
              true
            );
            reminder = true;
          } else {
            await sendDispatch(
              requestWithCoords,
              volunteers,
              volunteerTaskCounts
            );
          }

          messageSent = true;
          logger.info("Posted to Slack!");
        } catch (error) {
          logger.error("Unable to post to Slack: ", error);
        }

        if (messageSent) {
          if (reminder) {
            await requestWithCoords.airtableRequest
              .patchUpdate({
                "Reminder Posted": "yes",
              })
              .then(logger.info("Updated Airtable record!"))
              .catch((error) => logger.error(error));
          } else {
            await requestWithCoords.airtableRequest
              .patchUpdate({
                "Posted to Slack?": "yes",
                Status: record.get("Status") || "Needs assigning", // don't overwrite the status
              })
              .then(logger.info("Updated Airtable record!"))
              .catch((error) => logger.error(error));
          }
        }
      }

      nextPage();
    });
}

/**
 * Start the chat bot service.
 *
 * @returns {void}
 */
async function start() {
  try {
    // Run once right away, and run again every 15 seconds
    if (config.VOLUNTEER_DISPATCH_PREVENT_PROCESSING) {
      logger.info(
        "Processing prevented by VOLUNTEER_DISPATCH_PREVENT_PROCESSING flag!"
      );
    } else {
      logger.info("Volunteer Dispatch started!");
      setTimeout(checkForNewSubmissions, 0);
      setInterval(checkForNewSubmissions, 15000);
    }

    // Run an HTTP server for health-check purposes
    http.run();
  } catch (error) {
    logger.error(error);
  }
}

process.on("unhandledRejection", (reason) => {
  logger.error({
    message: `Unhandled Rejection: ${reason.message}`,
    stack: reason.stack,
  });
  // application specific logging, throwing an error, or other logic here
});

start();
