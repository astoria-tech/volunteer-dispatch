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
   *
   * @param {object} field to get from airtable record
   * @type {*} The Airtable field.
   */
  get(field) {
    return this.airtableRequest.get(field);
  }

  /**
   * ID of the record
   *
   * @type {string}
   */
  get id() {
    return this.airtableRequest.id;
  }

  /**
   * Tasks requester needs help with
   *
   * @type {Task[]}
   */
  get tasks() {
    return (this.get("Tasks") || []).map(Task.mapFromRawTask);
  }

  /**
   * "fields" property from the underlying airtable record.
   *
   * @type {object}
   */
  get rawFields() {
    return this.airtableRequest.fields;
  }

  /**
   * Address of the requester.
   *
   * @type {string} The requester address, including street, city and state.
   */
  get fullAddress() {
    return `${this.get("Address")} ${this.get("City")}, ${
      config.VOLUNTEER_DISPATCH_STATE
    }`;
  }

  /**
   * Co-ordinates if they are available.
   *
   * @type {object} Geo co-ordinates.
   */
  get coordinates() {
    return JSON.parse(this.get("_coordinates"));
  }

  /**
   * Address used to resolve coordinates.
   *
   * @see coordinates
   * @type {string} Address co-ordinates.
   */
  get coordinatesAddress() {
    return this.get("_coordinates_address");
  }
}

module.exports = RequestRecord;
