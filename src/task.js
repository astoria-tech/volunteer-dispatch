const preconditions = require('preconditions').singleton();

class Task {
  /**
   * Task that folks can request help for.
   *
   * @param rawTask String representing a possible value in the "Tasks" field
   * in "Requests" Airtable
   * @param supportRequirements Array of strings. Volunteers can specify how they can support. This
   *  is stored in the "I can provide the following support (non-binding)" field on the
   *  "Volunteers" Airtable
   * @param arbitraryRequirements Array of functions that return a boolean value if this errand has
   *  other arbitrary requirements.
   */
  constructor(rawTask, supportRequirements, arbitraryRequirements = []) {
    preconditions.shouldBeString(rawTask).shouldNotBeEmpty(rawTask);
    preconditions.shouldBeArray(supportRequirements);
    preconditions.shouldBeArray(arbitraryRequirements);
    arbitraryRequirements.forEach(preconditions.shouldBeFunction);
    this.rawTask = rawTask;
    this.supportRequirements = supportRequirements;
    this.otherFulfillmentRequirements = arbitraryRequirements;
  }

  /**
   * Check if a given volunteer can fulfill this task.
   *
   * This method is better housed in a volunteer matching utility or service class.
   * I am keeping it here for now because I did not want to introduce a new
   *  service/util layer this early in the project. We might need it eventually, though.
   *
   * @param volunteer Airtable record about volunteer
   * @returns {boolean}
   */
  canBeFulfilledByVolunteer(volunteer) {
    preconditions.shouldBeObject(volunteer);
    preconditions.shouldBeFunction(volunteer.get);
    const capabilities = volunteer.get('I can provide the following support (non-binding)') || [];
    // If the beginning of any capability matches the requirement,
    // the volunteer can handle the task
    return (this.supportRequirements.length === 0
      || this.supportRequirements.some((r) => capabilities.some((c) => c.startsWith(r))))
      && (this.otherFulfillmentRequirements.length === 0
         || this.otherFulfillmentRequirements.some((requirement) => requirement(volunteer)));
  }
}

const doesVolunteerHaveACar = (volunteer) => {
  const transportationModes = volunteer.get('Do you have a private mode of transportation with valid license/insurance? ');
  if (transportationModes) {
    return transportationModes.indexOf('Yes, I have a car') !== -1;
  }
  return false;
};
const possibleTasks = [
  new Task('Grocery shopping', ['Picking up groceries/medications']),
  new Task('Picking up a prescription', ['Picking up groceries/medications']),
  new Task('Transportation to/from a medical appointment', [], [doesVolunteerHaveACar]),
  new Task('Dog walking', [
    'Pet-sitting/walking/feeding',
  ]),
  new Task('Loneliness', [
    'Check-in on folks throughout the day (in-person or phone call)',
    'Checking in on people',
  ]),
  new Task('Accessing verified health information', [
    'Check-in on folks throughout the day (in-person or phone call)',
    'Checking in on people',
    'Navigating the health care/insurance websites',
  ]),
  new Task('Other', []),
];
const cache = {};
possibleTasks.forEach((errand) => {
  cache[errand.rawTask] = errand;
});
Task.mapFromRawTask = (rawTask) => cache[rawTask];

module.exports = Task;
