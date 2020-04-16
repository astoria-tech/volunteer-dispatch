const preconditions = require("preconditions").singleton();

const AirtableUtils = require("../airtable-utils");
const { logger } = require("../logger");
const { getCoords } = require("../geo");
const config = require("../config");
const RequestRecord = require("../model/request-record");

/**
 * APIs that deal with Request
 */
class RequestService {
  constructor(base, airtableUtils) {
    preconditions.shouldBeObject(base);
    this.base = base;
    this.airtableUtils = airtableUtils;
  }

  /**
   * Resolve and update coordinates for requester's address
   * @param request {RequestRecord} Request requiring coordinates
   * @returns {Promise<RequestRecord>} request records updated with coordinates
   * @throws error when unable to resolve coordinates or update them in airtable
   */
  async resolveAndUpdateCoords(request) {
    preconditions.shouldBeObject(request);
    preconditions.shouldBeString(request.fullAddress);
    try {
      if (request.coordinates) {
        return request;
      }
    } catch (e) {
      // error expected here
    }
    let errandCoords;
    try {
      errandCoords = await getCoords(request.fullAddress);
    } catch (e) {
      // catch error so we can log it with logger and in airtable
      logger.error(
        `Error getting coordinates for requester ${request.get(
          "Name"
        )} with error: ${JSON.stringify(e)}`
      );
      this.airtableUtils.logErrorToTable(
        config.AIRTABLE_REQUESTS_TABLE_NAME,
        request,
        e,
        "getCoords"
      );
      // re-throw error because there is no point in continuing or returning something else
      // and we should let caller know that something went wrong.
      throw e;
    }
    let updatedRecord;
    try {
      updatedRecord = await this.base.update(request.id, {
        _coordinates: JSON.stringify(errandCoords),
      });
    } catch (e) {
      // catch error so we can log it with logger and in airtable
      logger.error(
        `Error getting coordinates for requester ${request.get(
          "Name"
        )} with error: ${JSON.stringify(e)}`
      );
      this.airtableUtils.logErrorToTable(
        config.AIRTABLE_REQUESTS_TABLE_NAME,
        request,
        e,
        "update _coordinates"
      );
      // re-throw error because there is no point in continuing or returning something else
      // and we should let caller know that something went wrong.
      throw e;
    }
    return new RequestRecord(updatedRecord);
  }

  /**
   * Sets "Was split?" to "yes" in Airtable
   * @param request {RequestRecord} Original request record to be marked as split
   */
  markRequestAsSplit(request) {
    this.base.update(request.id, { "Was split?": "yes" }, (err) => {
      if (err) {
        logger.error(
          `Error updating 'Was split?' column in request ${request.id}`,
          err
        );
      }
    });
  }

  /**
   * Splits a task with multiple requests into one request per task.
   * New records are created in Airtable.
   * @param request {RequestRecord} Original request record with multiple tasks
   * @returns {Promise<void>}
   */
  async splitMultiTaskRequest(request) {
    preconditions.shouldBeObject(request);
    preconditions.checkArgument(request.tasks.length > 1);
    const newRecordsPerTask = request.tasks.map((task) =>
      AirtableUtils.cloneRequestFieldsWithGivenTask(request, task)
    );
    try {
      await this.base.create(newRecordsPerTask);
      this.markRequestAsSplit(request);
    } catch (e) {
      if (e) {
        logger.error(
          `Error cloning request with multiple tasks for request ${request.id}: `,
          e
        );
      }
    }
  }
}

module.exports = RequestService;
