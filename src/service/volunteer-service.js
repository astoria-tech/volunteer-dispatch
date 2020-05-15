const preconditions = require("preconditions").singleton();
const { Random, nodeCrypto } = require("random-js");

const config = require("../config");
const Task = require("../task");

/**
 * APIs that interact with Volunteer
 */
class VolunteerService {
  constructor(base) {
    preconditions.shouldBeObject(base);
    this.base = base;
    this.random = new Random(nodeCrypto);
  }

  /**
   * Honestly, this is being exposed for testing.
   *
   * @param {Array} lonelinessVolunteers to append to.
   * @returns {function(...[*]=)} A function that can be provided to Airtable's `eachPage` function
   */
  // eslint-disable-next-line class-methods-use-this
  appendVolunteersForLoneliness(lonelinessVolunteers) {
    return (volunteers, nextPage) => {
      volunteers
        .filter((v) => Task.LONELINESS.canBeFulfilledByVolunteer(v))
        .forEach((v) => lonelinessVolunteers.push(v));
      nextPage();
    };
  }

  /**
   * Fetches volunteers willing to to take on loneliness relates tasks
   *
   * @returns {Promise<[]>} Volunteers capable of handling loneliness tasks
   */
  async findVolunteersForLoneliness() {
    const lonelinessVolunteers = [];
    await this.base
      .select({
        view: config.AIRTABLE_VOLUNTEERS_VIEW_NAME,
        filterByFormula: "{Account Disabled} != TRUE()",
      })
      .eachPage(this.appendVolunteersForLoneliness(lonelinessVolunteers));
    const sampleSize =
      lonelinessVolunteers.length > 10 ? 10 : lonelinessVolunteers.length;
    return this.random.sample(lonelinessVolunteers, sampleSize);
  }
}

module.exports = VolunteerService;
