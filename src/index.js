const Airtable = require("airtable");

const Task = require("./task");
const config = require("./config");
const AirtableUtils = require("./airtable-utils");
const http = require("./http");
const { getCoords, distanceBetweenCoords } = require("./geo");
const { logger } = require("./logger/");
const Request = require("./model/request-record");
const RequestService = require("./service/request-service");

const { sendMessage } = require("./slack/dispatch");
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
  base(config.AIRTABLE_REQUESTS_TABLE_NAME)
);

function fullAddress(record) {
  return `${record.get("Address")} ${record.get("City")}, ${
    config.VOLUNTEER_DISPATCH_STATE
  }`;
}

// Accepts errand address and checks volunteer spreadsheet for closest volunteers
async function findVolunteers(request) {
  const volunteerDistances = [];

  const tasks = (request.get("Tasks") || []).map(Task.mapFromRawTask);
  let errandCoords;
  try {
    errandCoords = await getCoords(fullAddress(request));
  } catch (e) {
    logger.error(
      `Error getting coordinates for requester ${request.get(
        "Name"
      )} with error: ${JSON.stringify(e)}`
    );
    customAirtable.logErrorToTable(
      config.AIRTABLE_REQUESTS_TABLE_NAME,
      request,
      e,
      "getCoords"
    );
    return [];
  }

  logger.info(`Tasks: ${tasks.map((task) => task.rawTask).join(", ")}`);

  // Figure out which volunteers can fulfill at least one of the tasks
  await base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
    .select({ view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME })
    .eachPage(async (volunteers, nextPage) => {

      const suitableVolunteers = volunteers.filter((volunteer) =>
        tasks.some((task) => task.canBeFulfilledByVolunteer(volunteer))
      );
      console.log("Request Langauge", request.get("Language"))
      // Calculate the distance to each volunteer
      for (const volunteer of suitableVolunteers) {
        // console.log(volunteer.get("Please list what other languages you speak, if any, and level of fluency. "))
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
  const requestLanguage = request.get("Language")
  const closestVolunteers = volunteerDistances
    .sort((a, b) => {
      let aLanguage, aProficiency, bLanguage, bProficiency;

      const aLanguages = a[0].get("Please list what other languages you speak, if any, and level of fluency. ")
      const bLanguages = b[0].get("Please list what other languages you speak, if any, and level of fluency. ")
      // console.log(aLanguages)
      // console.log(bLanguages)
      if (aLanguages) {
         for (let language of aLanguages) {
        const [lang, prof] = language.split(" - ");
        if (lang === requestLanguage) {
          aLanguage = lang
          aProficiency = prof
        }
      }
      }
     
      if (bLanguages) {
        for (let language of bLanguages) {
        const [lang, prof] = language.split(" - ");
        if (lang === requestLanguage) {
          bLanguage = lang
          bProficiency = prof
        }
      }
      }
      

      if (aLanguage === requestLanguage && bLanguage !== requestLanguage) {
        return -1
      } else if (bLanguage === requestLanguage && aLanguage !== requestLanguage) {
        return 1
      } else if (bLanguage === requestLanguage && aLanguage === requestLanguage) {
        if (bProficiency === "fluent" && aProficiency !== "fluent") {
          return -1
        } else if (aProficiency === "fluent" && bProficiency !== "fluent") {
          return 1
        } else {
          return a[1] - b[1]
        }
      } else {
        return a[1] - b[1]
      }

    })
    .slice(0, 10)
    .map((volunteerAndDistance) => {
      const [volunteer, distance] = volunteerAndDistance;
      return {
        Name: volunteer.get("Full Name"),
        Number: volunteer.get("Please provide your contact phone number:"),
        Distance: distance,
        record: volunteer,
        Language: volunteer.get("Please list what other languages you speak, if any, and level of fluency. ")
      };
    });

  logger.info("Closest:");
  closestVolunteers.forEach((v) => {
    logger.info(`${v.Name} ${v.Distance.toFixed(2)} Mi${v.Language ? ", Speaks " + v.Language : ""}`);
  });

  return closestVolunteers;
}

// Checks for updates on errand spreadsheet, finds closest volunteers from volunteer spreadsheet and
// executes slack message if new row has been detected
async function checkForNewSubmissions() {
  base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_REQUESTS_VIEW_NAME,
      filterByFormula: "NOT({Was split?} = 'yes')",
    })
    .eachPage(async (records, nextPage) => {
      // Remove records we don't want to process from the array.
      const cleanRecords = records
        .filter((r) => {
          if (typeof r.get("Name") === "undefined") return false;
          if (r.get("Posted to Slack?") === "yes") return false;
          return true;
        })
        .map((r) => new Request(r));

      // Look for records that have not been posted to slack yet
      for (const record of cleanRecords) {
        if (record.tasks.length > 1) {
          // noinspection ES6MissingAwait
          requestService.splitMultiTaskRequest(record);
          continue;
        }

        logger.info(`New help request for: ${record.get("Name")}`);

        // Find the closest volunteers
        const volunteers = await findVolunteers(record);

        // Send the message to Slack
        let messageSent = false;
        try {
          await sendMessage(record, volunteers);
          messageSent = true;
          logger.info("Posted to Slack!");
        } catch (error) {
          logger.error("Unable to post to Slack: ", error);
        }

        if (messageSent) {
          await record.airtableRequest
            .patchUpdate({
              "Posted to Slack?": "yes",
              Status: record.get("Status") || "Needs assigning", // don't overwrite the status
            })
            .then(logger.info("Updated Airtable record!"))
            .catch((error) => logger.error(error));
        }
      }

      nextPage();
    });
}

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

process.on("unhandledRejection", (reason, promise) => {
  logger.error({
    message: `Unhandled Rejection: ${reason.message}`,
    stack: reason.stack,
  });
  // application specific logging, throwing an error, or other logic here
});

start();
