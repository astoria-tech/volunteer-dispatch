/**
 * A User in the system
 */
class UserRecord {
  constructor(airtableRequest) {
    this.airtableRequest = airtableRequest;
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
   * Emulates a getter you would normally see on an Airtable object.
   *
   * @param {*} field Field to get
   * @throws an error always, to let you know that this isn't the right way to access a property.
   */
  // eslint-disable-next-line class-methods-use-this
  get(field) {
    throw Error(
      `Please try to access the property '${field}' using its getter instead of this method.`
    );
  }

  /**
   * Full name of the user
   *
   * @type {string}
   */
  get fullName() {
    return this.airtableRequest.get("Full Name");
  }

  /**
   * Phone number of the user
   *
   * @type {string}
   */
  get phoneNumber() {
    return this.airtableRequest.get("Phone Number");
  }
}

module.exports = UserRecord;
