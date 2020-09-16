const Airtable = require("airtable");

const Task = require("./task");
const config = require("./config");
const AirtableUtils = require("./utils/airtable-utils");
const { filterByLanguage } = require("./languageFilter");
const http = require("./http");
const { getCoords, distanceBetweenCoords } = require("./geo");
const { logger } = require("./logger");
const Request = require("./model/request-record");
const RequesterService = require("./service/requester-service");
const RequestService = require("./service/request-service");
const VolunteerService = require("./service/volunteer-service");
const { formatPhoneNumber } = require("./utils/phone-number-utils");

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
const requesterService = new RequesterService(
  base(config.AIRTABLE_REQUESTERS_TABLE_NAME)
);
const requestService = new RequestService(
  base(config.AIRTABLE_REQUESTS_TABLE_NAME),
  customAirtable,
  requesterService
);
const volunteerService = new VolunteerService(
  base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
);

/**
 * Fetch volunteers and return custom fields.
 *
 * @param {Array} volunteerAndDistance An array with volunteer record on the 0th index and its
 * distance from requester on the 1st index
 * @param {object} request The Airtable request object.
 * @returns {{Number: *, record: *, Distance: *, Name: *, Language: *}} Custom volunteer fields.
 */
function volunteerWithCustomFields(volunteerAndDistance, request) {
  const [volunteer, distance] = volunteerAndDistance;
  let volLanguage = request.get("Language")
    ? request.get("Language")
    : volunteer.get("Please select any language you have verbal fluency with:");

  if (Array.isArray(volLanguage)) {
    if (volLanguage.length > 1) {
      volLanguage = volLanguage.join(", ");
    }
  }

  return {
    Name: volunteer.get("Full Name"),
    Number: volunteer.get("Please provide your contact phone number:"),
    Distance: distance,
    record: volunteer,
    Id: volunteer.id,
    Language: volLanguage,
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
      .map((volunteerAndDistance) =>
        volunteerWithCustomFields(volunteerAndDistance, request)
      );
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

  // Filter the volunteers by language, then sort by distance and grab the closest 10
  const volFilteredByLanguage = filterByLanguage(request, volunteerDistances);

  const closestVolunteers = volFilteredByLanguage
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map((volunteerAndDistance) =>
      volunteerWithCustomFields(volunteerAndDistance, request)
    );

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
      if (!records.length) return;

      const newSubmissions = records.map((r) => new Request(r));

      // Look for records that have not been posted to slack yet
      for (const record of newSubmissions) {
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

        try {
          // Can be an async operation
          // noinspection ES6MissingAwait - no need to wait for a response.
          requestService.linkUserWithRequest(record);
        } catch (e) {
          logger.error("Unable to link user with request ", e);
        }

        let volunteers;
        try {
          // Find the closest volunteers
          volunteers = await findVolunteers(requestWithCoords);
        } catch (e) {
          logger.error("Unable to find volunteers for request ", e);
        }

        // Send the message to Slack
        let messageSent = false;
        let reminder = false;

        try {
          if (
            Date.now() > record.get("Reminder Date/Time") &&
            record.get("Posted to Slack?") === "yes"
          ) {
            await sendDispatch(requestWithCoords, volunteers, true);
            reminder = true;
          } else {
            await sendDispatch(requestWithCoords, volunteers);
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

  // Check if Twilio credentials are present, in order to send followup text
  const accountSid = config.TWILIO_ACCOUNT_SID;
  const authToken = config.TWILIO_AUTH_TOKEN;
  const client = require("twilio")(accountSid, authToken);
  const twilioPhoneNumber = config.TWILIO_PHONE_NUMBER;
  const hasTwilioCredentials = accountSid && authToken && twilioPhoneNumber;

  // Check Airtable for tasks completed in the last day, then send volunteer
  // a followup text
  base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_REQUESTS_VIEW_NAME,
      filterByFormula: `
        AND(
          {Status} = 'Completed',
          IS_AFTER({Last modified time}, (DATEADD(TODAY(), -1, 'days'))),
          {Followup SMS Sent?} = 'No'
        )`,
    })
    .eachPage(async (records, nextPage) => {
      if (!records.length) return;

      for (const record of records) {
        const volunteerId = record.get("Assigned Volunteer")[0];

        base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME).find(volunteerId, function (
          err,
          rec
        ) {
          if (err) {
            logger.error(err);
            return;
          }
          const phoneNumber = rec.get(
            "Please provide your contact phone number:"
          );
          const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

          if (hasTwilioCredentials) {
            logger.info(`Sending followup text to: ${formattedPhoneNumber}`);
            client.messages
              .create({
                body: "Thank you for being a great neighbor!",
                from: config.TWILIO_PHONE_NUMBER,
                to: formattedPhoneNumber,
              })
              .then((message) => {
                logger.info(`Message SID: ${message.sid}`);
                base(config.AIRTABLE_REQUESTS_TABLE_NAME).update(
                  [
                    {
                      id: record.id,
                      fields: {
                        "Followup SMS Sent?": "Yes",
                      },
                    },
                  ],
                  function (err, records) {
                    if (err) {
                      logger.error(err);
                      return;
                    }
                    records.forEach(function (record) {
                      logger.info(
                        `Followup text sent?: ${record.get(
                          "Followup SMS Sent?"
                        )}`
                      );
                    });
                  }
                );
              })
              .catch((error) => {
                logger.error(`onRejected function called: ${error.message}`);
              });
          } else {
            logger.error(
              "Twilio credentials missing -- Followup text not sent"
            );
          }
        });
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
