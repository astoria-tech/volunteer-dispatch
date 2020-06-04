const moment = require("moment");

/**
 * Get the amount of time passed from a date until now.
 *
 * @param {string} date Date string as returned from Airtable.
 * @returns {string} A colloquial express of ellapsed time (e.g., 2 months ago)
 */
const getElapsedTime = (date) => {
  return moment(date).fromNow();
};

module.exports = {
  getElapsedTime,
};
