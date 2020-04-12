const preconditions = require("preconditions").singleton();

const AirtableUtils = require("../airtable-utils");
const { logger } = require("../logger/");

/**
 * APIs that deal with Request
 */
class RequestService {
  constructor(base) {
    preconditions.shouldBeObject(base);
    this.base = base;
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
