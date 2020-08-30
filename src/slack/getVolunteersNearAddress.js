const Airtable = require("airtable");
const AirtableUtils = require("../utils/airtable-utils");
const { logger } = require("../logger");
const { getCoords, distanceBetweenCoords } = require("../geo");
const { bot, token } = require("./bot");
const message = require("./message");

const config = require("../config");
require("dotenv").config();

const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);
const customAirtable = new AirtableUtils(base);

async function getVolunteersNearAddress(body) {
    console.log(body)

  if (!body.text) return;
  // const slashCoords = await getCoords(body.text)
  const slashCoords = { latitude: 40.758011, longitude: -73.930813 };
  const channel = req.body.channel_ID;

  const matches = [];
  // Figure out which volunteers can fulfill at least one of the tasks
  await base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
      filterByFormula: "{Account Disabled} != TRUE()",
    })
    .eachPage(async (volunteers, nextPage) => {
      // Calculate the distance to each volunteer
      for (const volunteer of volunteers) {
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
        const distance = distanceBetweenCoords(volCoords, slashCoords);
        matches.push([volunteer, distance]);
      }
      nextPage();
    });

  const volunteersNearby = matches.sort((a, b) => a[1] - b[1]).slice(0, 10);

  return sendVolunteersNearAddress(volunteersNearby, channel);
}

async function sendVolunteersNearAddress(volutneers, channel) {
    return
}

module.exports = {
  getVolunteersNearAddress,
};

// return all volunteers, being sure to show language, pref contact, tasks signed up for
