const preconditions = require("preconditions").singleton();

const config = require("../config");
const UserRecord = require("../model/user-record");
const phoneNumberUtil = require("../utils/phone-number-utils");

/**
 * Extracts a user record from a Airtable's select operation.
 *
 * @param {string} paramForSearching Parameter that was used to search for the record
 * @param {[]} records Records returned by an Airtable select operation
 * @returns {object}  An extracted user record from extracted
 */
// eslint-disable-next-line no-unused-vars
function extractUserRecordIfAvailable(paramForSearching, records) {
  if (records && records.length > 1) {
    throw new Error(
      `${paramForSearching} has more than one user linked to it!`
    );
  }
  let userRecord = null;
  if (records && records.length === 1) {
    // eslint-disable-next-line no-param-reassign
    userRecord = new UserRecord(records[0]);
  }
  return userRecord;
}

/**
 * APIs that deal with Users
 */
class UserService {
  constructor(base) {
    preconditions.shouldBeObject(base);
    this.base = base;
  }

  /**
   * Looks for a user with the provided phone number
   *
   * @param {string} phoneNumber to search with
   * @returns {Promise<UserRecord|null>} User, if one is found. Null otherwise.
   */
  async findUserByPhoneNumber(phoneNumber) {
    preconditions.shouldBeString(phoneNumber);
    const phoneNumberToSearch = phoneNumberUtil.getDisplayNumber(phoneNumber);
    const records = await this.base
      .select({
        view: config.AIRTABLE_USERS_VIEW_NAME,
        filterByFormula: `{Phone Number} = '${phoneNumberToSearch}'`,
      })
      .firstPage();
    return extractUserRecordIfAvailable(phoneNumber, records);
  }

  /**
   * Looks for a user with the provided name
   *
   * @param {string} fullName to search with
   * @returns {Promise<UserRecord|null>} User, if one is found. Null otherwise.
   */
  async findUserByFullName(fullName) {
    preconditions.shouldBeString(fullName);
    // eslint-disable-next-line prefer-const
    const records = await this.base
      .select({
        view: config.AIRTABLE_USERS_VIEW_NAME,
        filterByFormula: `{Full Name} = '${fullName}'`,
      })
      .firstPage();
    return extractUserRecordIfAvailable(fullName, records);
  }

  /**
   * Creates a new User
   *
   * @param {string} fullName Full name of the user
   * @param {string} phoneNumber Phone number of the user
   * @returns {Promise<UserRecord>} The created record
   */
  async createUser(fullName, phoneNumber) {
    const record = await this.base.create({
      "Full Name": fullName,
      "Phone Number": phoneNumberUtil.getDisplayNumber(phoneNumber),
    });
    return new UserRecord(record);
  }
}

module.exports = UserService;
