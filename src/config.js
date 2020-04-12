require("dotenv").config();

const config = {
  // Geocoder
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  MAPQUEST_KEY: process.env.MAPQUEST_KEY,
  VOLUNTEER_DISPATCH_STATE: process.env.VOLUNTEER_DISPATCH_STATE || "NY",

  // Airtable
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  AIRTABLE_REQUESTS_VIEW_URL: process.env.AIRTABLE_REQUESTS_VIEW_URL,
  AIRTABLE_VOLUNTEERS_VIEW_URL: process.env.AIRTABLE_VOLUNTEERS_VIEW_URL,
  AIRTABLE_REQUESTS_TABLE_NAME:
    process.env.AIRTABLE_REQUESTS_TABLE_NAME || "Requests",
  AIRTABLE_VOLUNTEERS_TABLE_NAME:
    process.env.AIRTABLE_VOLUNTEERS_TABLE_NAME || "Volunteers",

  // Slack
  SLACK_TOKEN: process.env.SLACK_XOXB,
  SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
  SLACK_ALERT_CHANNEL_ID: process.env.SLACK_ALERT_CHANNEL_ID,
};

module.exports = Object.freeze(config);
