const { logger } = require("./logger/");

class CustomAirtable {
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
}

module.exports = CustomAirtable;
