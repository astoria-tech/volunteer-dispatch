const Task = require("../task");
const config = require("../config");

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

  /**
   * Address of the requester. Includes street, city and state.
   * @returns {string}
   */
  get fullAddress() {
    return `${this.get("Address")} ${this.get("City")}, ${
      config.VOLUNTEER_DISPATCH_STATE
    }`;
  }

  /**
   * Co-ordinates if they are available.
   * @returns {Object}
   */
  get coordinates() {
    return JSON.parse(this.get("_coordinates"));
  }
}

module.exports = RequestRecord;
