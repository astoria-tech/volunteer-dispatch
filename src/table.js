module.exports = Object.freeze({
  REQUESTS: process.env.AIRTABLE_REQUESTS_TABLE_NAME || 'Requests',
  VOLUNTEERS: process.env.AIRTABLE_VOLUNTEERS_TABLE_NAME || 'Volunteers',
});
