const Airtable = require("airtable");

const AirtableUtils = require("../../src/utils/airtable-utils");
const config = require("../../src/config");
const Request = require("../../src/model/request-record");
const RequesterService = require("../../src/service/requester-service");
const RequestService = require("../../src/service/request-service");

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
/**
 * Checks `Requests` table for records without a `Requester`, and runs each of
 * of those records through linkUserWithRequest() to create a new record, or
 * update an existing one, in `Requesters` table.
 *
 * @returns {void}
 */
async function backfillRequesters() {
  base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: config.AIRTABLE_REQUESTS_VIEW_NAME,
      filterByFormula: `{Requester} = ''`,
    })
    .eachPage(async (records, nextPage) => {
      if (!records.length) return;
      const mappedRecords = records.map((r) => new Request(r));
      for (const record of mappedRecords) {
        await requestService.linkUserWithRequest(record);
      }

      nextPage();
    });
}

backfillRequesters();
