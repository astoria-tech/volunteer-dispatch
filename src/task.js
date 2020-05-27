const preconditions = require("preconditions").singleton();

class Task {
  /**
   * Task that folks can request help for.
   *
   * @param {string} rawTask representing a possible value in the "Tasks" field
   *  in "Requests" Airtable
   * @param {Array} supportRequirements Array of strings. Volunteers can specify how they
   *  can support. This is stored in the "I can provide the following support (non-binding)"
   *  field on the "Volunteers" Airtable
   * @param {Array} arbitraryRequirements Array of functions that return a boolean value if
   *  this errand has other arbitrary requirements.
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
   * service/util layer this early in the project. We might need it eventually, though.
   *
   * @param {object} volunteer Airtable record about volunteer
   * @returns {boolean} True if volunteer can fulfillt task.
   */
  canBeFulfilledByVolunteer(volunteer) {
    preconditions.shouldBeObject(volunteer);
    preconditions.shouldBeFunction(volunteer.get);
    const capabilities =
      volunteer.get("I can provide the following support (non-binding)") || [];
    // If the beginning of any capability matches the requirement,
    // the volunteer can handle the task
    return (
      (this.supportRequirements.length === 0 ||
        this.supportRequirements.some((r) =>
          capabilities.some((c) => c.startsWith(r))
        )) &&
      (this.otherFulfillmentRequirements.length === 0 ||
        this.otherFulfillmentRequirements.some((requirement) =>
          requirement(volunteer)
        ))
    );
  }

  equals(task) {
    return this.rawTask === task.rawTask;
  }
}

const doesVolunteerHaveACar = (volunteer) => {
  const transportationModes = volunteer.get(
    "Do you have a private mode of transportation with valid license/insurance? "
  );
  if (transportationModes) {
    return transportationModes.indexOf("Yes, I have a car") !== -1;
  }
  return false;
};

Task.GROCERY_SHOPPING = new Task("Grocery shopping", [
  "Picking up groceries/medications",
]);
Task.PRESCRIPTION_PICKUP = new Task("Picking up a prescription", [
  "Picking up groceries/medications",
]);
Task.MEDICAL_APPT_TRANSPORTATION = new Task(
  "Transportation to/from a medical appointment",
  [],
  [doesVolunteerHaveACar]
);
Task.DOG_WALKING = new Task("Dog walking", ["Pet-sitting/walking/feeding"]);
Task.LONELINESS = new Task("Loneliness", [
  "Check-in on folks throughout the day (in-person or phone call)",
  "Checking in on people",
]);
Task.ACCESS_HEALTH_INFO = new Task("Accessing verified health information", [
  "Check-in on folks throughout the day (in-person or phone call)",
  "Checking in on people",
  "Navigating the health care/insurance websites",
]);
// Match most requirements since we don't know the nature of an "Other"
Task.OTHER = new Task("Other", [
  "Meal delivery",
  "Picking up groceries/medications",
  "Pet-sitting/walking/feeding",
  "Checking in on people",
  "Donations of other kind",
]);
Task.possibleTasks = [
  Task.GROCERY_SHOPPING,
  Task.PRESCRIPTION_PICKUP,
  Task.MEDICAL_APPT_TRANSPORTATION,
  Task.DOG_WALKING,
  Task.LONELINESS,
  Task.ACCESS_HEALTH_INFO,
  Task.OTHER,
];
const cache = {};
Task.possibleTasks.forEach((errand) => {
  cache[errand.rawTask] = errand;
});
Task.mapFromRawTask = (rawTask) => cache[rawTask];

module.exports = Task;
