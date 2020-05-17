const preconditions = require("preconditions").singleton();
const { logger } = require("./logger");

class AirtableUtils {
  constructor(base) {
    this.base = base;
  }

  /**
   * Logs errors to Airtable.
   *
   * @param {string} table - name of the table to log to.
   * @param {object} request - the request to check.
   * @param {object} error - the error to log.
   * @param {string} operation - the
   * @returns {void}
   */
  logErrorToTable(table, request, error, operation) {
    let errorToInsertInAirtable = `${Date.now()} - ${JSON.stringify(error)}`;
    if (operation) {
      errorToInsertInAirtable += ` while performing ${operation}`;
    }
    const existingErrors = request.get("Error");
    if (existingErrors) {
      errorToInsertInAirtable = `${existingErrors}, ${errorToInsertInAirtable}`;
    }
    this.base(table)
      .update(request.id, { Error: errorToInsertInAirtable })
      .catch((reason) => {
        logger.error(
          `Error while trying to update Error field in table ${table} for request ${request.id}`
        );
        logger.error(reason);
      });
  }

  /**
   * Clones fields of the provided request record, while replacing the "Tasks"
   * field with the given task.
   *
   * @param {object} request Request whose fields you want to clone
   * @param {object} task Task to be set
   * @param {string} order String that indicates the order of given task
   * relative to total tasks in the request
   * @returns {{fields: {Tasks: string[], "Cloned from": string[],
   * "Task Order": string[]}}} along with properties from the original request
   */
  static cloneRequestFieldsWithGivenTask(request, task, order) {
    preconditions.shouldBeObject(request);
    preconditions.shouldBeDefined(request.id);
    preconditions.shouldBeObject(request.rawFields);
    preconditions.shouldBeObject(task);
    preconditions.shouldBeString(order);
    const fields = {
      ...request.rawFields,
      "Original Tasks": request.rawFields.Tasks,
      Tasks: [task.rawTask],
      "Cloned from": [request.id],
      "Task Order": order,
    };
    delete fields["Created time"];
    delete fields["Record ID"];
    delete fields.Error;
    return { fields };
  }
}

module.exports = AirtableUtils;
