const Airtable = require("airtable");
const { logger } = require("../logger");
const { getCoords, distanceBetweenCoords } = require("../geo");
const {
  sendVolunteersNearAddress,
  sendVolunteersNearAddressHelp,
} = require("./sendVolunteersNearAddress");

const config = require("../config");
require("dotenv").config();

const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);

/**
 * @param {object} body The slash command request body
 * @returns {void}
 */
async function getVolunteersNearAddress(body) {
  if (!body.text || !body.user_id) return;

  const input = body.text;
  const user = body.user_id;

  if (input.toLowerCase() === "help") {
    sendVolunteersNearAddressHelp(user);
    return;
  }

  const slashCoords = await getCoords(input);

  const matches = [];
  await base(config.AIRTABLE_VOLUNTEERS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
      filterByFormula: "{Account Disabled} != TRUE()",
    })
    .eachPage(async (volunteers, nextPage) => {
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
  sendVolunteersNearAddress(volunteersNearby, user);
}

module.exports = {
  getVolunteersNearAddress,
};
