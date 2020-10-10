const Airtable = require("airtable");
const condenseWhitespace = require("condense-whitespace");

const config = require("../../src/config");
const { logger } = require("../../src/logger");

const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);

/**
 * Checks table for records that contain extra whitespace and removes the extra
 * whitespace
 *
 * @returns {void}
 * @param {string} tableName - Name of table to check for extra whitespace
 * @param {string} fieldName - Name of field to check for extra whitespace
 */
async function removeExtraWhitespace(tableName, fieldName) {
  if (process.argv.length < 3) {
    logger.error("Incorrect number of arguments");
  }

  const errors = [];
  let table;
  let view;
  let updatedCount = 0;
  let totalCount = 0;
  if (tableName.toLowerCase() === "requests") {
    table = config.AIRTABLE_REQUESTS_TABLE_NAME;
    view = config.AIRTABLE_REQUESTS_VIEW_NAME;
  } else if (tableName.toLowerCase() === "volunteers") {
    table = config.AIRTABLE_VOLUNTEERS_TABLE_NAME;
    view = config.AIRTABLE_VOLUNTEERS_VIEW_NAME;
  } else {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  await base(table)
    .select({
      view,
      filterByFormula: `OR(
        LEFT({${fieldName}}, 1) = " ",
        RIGHT({${fieldName}}, 1) = " ",
        FIND("  ", {${fieldName}}) > 0
      )`,
    })
    .eachPage(async (records, nextPage) => {
      if (!records.length) {
        logger.info("No records require updating");
        return;
      }
      for (const record of records) {
        logger.info(`Now processing:`);
        logger.info(`id: ${record.id}`);
        let currentValue;
        try {
          currentValue = await record.get(fieldName);
          if (!currentValue) {
            throw new Error("Invalid field name");
          }
        } catch (err) {
          logger.error(err);
          return;
        }

        const condensedValue = condenseWhitespace(currentValue);
        const extraSpace = currentValue.length - condensedValue.length;

        try {
          await base(table).update(
            record.id,
            { [fieldName]: condensedValue },
            function (err) {
              if (err) {
                logger.error(err);
              }
            }
          );
        } catch (err) {
          errors.push({
            id: record.id,
            name: currentValue,
            error: err,
          });
          logger.error(err);
        }
        logger.info(
          `Removed ${extraSpace} extra space${extraSpace > 1 ? "s" : ""}`
        );
        updatedCount += 1;
        totalCount += 1;
        console.log("");
      }
      nextPage();
    })
    .catch((err) => {
      console.log("are we here?");
      return logger.error(err);
    });
  logger.info(`Successfully updated ${updatedCount} of ${totalCount} records`);
  if (errors.length > 0) {
    logger.info(`${errors.length} error${errors.length === 1 ? "" : "s"}`);
    console.log("errors", errors);
  }
}

removeExtraWhitespace(process.argv[2], process.argv[3]).catch((err) =>
  logger.error(err)
);
