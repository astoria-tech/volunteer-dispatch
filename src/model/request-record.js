const Task = require("../task");

/**
 * Request for help.
 */
class RequestRecord {
  constructor(airtableRequest) {
    this.airtableRequest = airtableRequest;
  }

  /**
   * Get other field from airtable.
   * @param field Field to get from airtable record
   * @returns {*}
   */
  get(field) {
    return this.airtableRequest.get(field);
  }

  /**
   * ID of the record
   * @type {string}
   */
  get id() {
    return this.airtableRequest.id;
  }

  /**
   * Tasks requester needs help with
   * @type {Task[]}
   */
  get tasks() {
    return (this.get("Tasks") || []).map(Task.mapFromRawTask);
  }

  /**
   * "fields" property from the underlying airtable record.
   * @type {Object}
   */
  get rawFields() {
    return this.airtableRequest.fields;
  }
}

module.exports = RequestRecord;
