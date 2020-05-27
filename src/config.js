require("dotenv").config();

/**
 * Environment boolean.
 *
 * @param {string} name The name of the environment variable.
 * @param {boolean} defaultValue The default value if name is not available.
 * @returns {boolean} True if name environment variable exists, or defaultValue.
 */
function envBoolean(name, defaultValue) {
  if (process.env[name]) {
    return process.env[name] === "true";
  }
  return defaultValue;
}

const config = {
  // General
  VOLUNTEER_DISPATCH_PREVENT_PROCESSING: envBoolean(
    "VOLUNTEER_DISPATCH_PREVENT_PROCESSING",
    false
  ),

  // Geocoder
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  MAPQUEST_KEY: process.env.MAPQUEST_KEY,
  VOLUNTEER_DISPATCH_STATE: process.env.VOLUNTEER_DISPATCH_STATE || "NY",

  // Airtable
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,

  AIRTABLE_REQUESTS_TABLE_NAME:
    process.env.AIRTABLE_REQUESTS_TABLE_NAME || "Requests",
  AIRTABLE_REQUESTS_VIEW_NAME:
    process.env.AIRTABLE_REQUESTS_VIEW_NAME || "Grid view",
  AIRTABLE_REQUESTS_VIEW_URL: process.env.AIRTABLE_REQUESTS_VIEW_URL,

  AIRTABLE_VOLUNTEERS_TABLE_NAME:
    process.env.AIRTABLE_VOLUNTEERS_TABLE_NAME || "Volunteers",
  AIRTABLE_VOLUNTEERS_VIEW_NAME:
    process.env.AIRTABLE_VOLUNTEERS_VIEW_NAME || "Grid view",
  AIRTABLE_VOLUNTEERS_VIEW_URL: process.env.AIRTABLE_VOLUNTEERS_VIEW_URL,

  // Slack
  SLACK_TOKEN: process.env.SLACK_XOXB,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
  SLACK_ALERT_CHANNEL_ID: process.env.SLACK_ALERT_CHANNEL_ID,
};

module.exports = Object.freeze(config);
