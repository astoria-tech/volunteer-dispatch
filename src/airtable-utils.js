const preconditions = require("preconditions").singleton();
const { logger } = require("./logger");

class AirtableUtils {
  constructor(base) {
    this.base = base;
  }

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
   * @param request {RequestRecord} Request whose fields you want to clone
   * @param task {Task} Task to be set
   * @returns {{fields: {Tasks: string[], "Cloned from": string[]}}} along with
   * properties from the original request
   */
  static cloneRequestFieldsWithGivenTask(request, task) {
    preconditions.shouldBeObject(request);
    preconditions.shouldBeDefined(request.id);
    preconditions.shouldBeObject(request.rawFields);
    preconditions.shouldBeObject(task);
    const fields = {
      ...request.rawFields,
      Tasks: [task.rawTask],
      "Cloned from": [request.id],
    };
    delete fields["Created time"];
    delete fields.Error;
    return { fields };
  }
}

module.exports = AirtableUtils;
