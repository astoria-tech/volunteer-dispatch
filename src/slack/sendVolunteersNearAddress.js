const { bot, token } = require("./bot");
const { volunteerWithCustomFields } = require("../volunteerWithCustomFields");
const {
  getSection,
  getVolunteerHeading,
  getVolunteers,
  getCopyPasteNumbers,
} = require("./message");

/**
 * @param {Array} volunteersWithDistance An array of objects of the closest volunteers to the
 * address, with distance from the address
 * @param {string} user ID of the user who initiated the slash command
 * @returns {void}
 */
const sendVolunteersNearAddress = async (volunteersWithDistance, user) => {
  const volunteers = volunteersWithDistance.map((v) =>
    volunteerWithCustomFields(v)
  );
  const nums = getCopyPasteNumbers(volunteers);

  await bot.chat.postMessage({
    token,
    channel: user,
    text: "Volunteers found!",
    blocks: [
      getVolunteerHeading(volunteers),
      ...getVolunteers(volunteers),
      getSection("*And here are their numbers for easy copy/pasting:*"),
      getSection(nums),
    ],
  });
};

/**
 * @param {string} user ID of the user who initiated the slash command
 * @returns {void}
 */
const sendVolunteersNearAddressHelp = async (user) => {
  await bot.chat.postMessage({
    token,
    channel: user,
    text:
      "This slash command takes an address and responds with nearby volunteers, just like when a new ticket is created. For example, try copy pasting the following into slack:\n\n `/volunteer-near 35-33 29th Street 11106`",
  });
};

module.exports = {
  sendVolunteersNearAddress,
  sendVolunteersNearAddressHelp,
};
