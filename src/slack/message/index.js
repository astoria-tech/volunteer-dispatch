/* eslint-disable consistent-return */
require("dotenv").config();
const config = require("../../config");
const { getDisplayNumber } = require("./phone-number-utils");

/**
 * Format section message for slack
 *
 * @param {string} text - message to print
 * @returns {object} - formatting object for slack
 */
const getSection = (text) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

/**
 * Get text for reminders or new errand
 *
 * @param {object} options The options containing the reminder.
 * @returns {string} Text based on the reminder.
 */
const getText = (options) => {
  return options.reminder
    ? "Reminder for a previous request"
    : "A new errand has been added";
};

/**
 * Format heading section for slack
 *
 * @param {object} options The configuration options.
 * @param {string} options.text The message to format.
 * @param {boolean} options.reminder Whether this message is a reminder or not.
 * @returns {object} The formatted heading.
 */
const getHeading = (options) => {
  if (options.reminder) {
    return getSection(`:alarm_clock: *${options.text}* :alarm_clock:`);
  }

  return getSection(`:exclamation: *${options.text}* :exclamation:`);
};

/**
 * Format task order for split tasks.
 *
 * @param {object} record The split task to get order from.
 * @returns {object} The formatted task order to display after message header.
 */
const getTaskOrder = (record) => {
  if (record.get("Task Order")) {
    return getSection(
      `:bellhop_bell: This is *Task ${record.get("Task Order")}* of the Request`
    );
  }
};

/**
 * Pluralize strings.
 *
 * @param {number} num The number associated with the string.
 * @param {string} str The message to pluralize.
 * @returns {string} The pluralized string.
 */
const pluralize = (num, str) => {
  const sMaybe = num === 1 ? "" : "s";
  return `${num} ${str}${sMaybe}`;
};

/**
 * Format languages for slack display
 *
 * @param {object} record - the requested task to get the language from
 * @returns {string} - the formatted languages to display in slack
 */
const getLanguage = (record) => {
  const languages = [record.get("Language"), record.get("Language - other")];
  const languageList = languages.filter((language) => language).join(", ");

  const formattedLanguageList = `${
    languageList.length ? languageList : "None provided"
  }`;

  return formattedLanguageList;
};

/**
 * Format the task requester for display in slack
 *
 * @param {object} record - the requested task to get the requester from
 * @returns {object} - formatted requester
 */
const getRequester = (record) => {
  const heading = "*Requester:*";
  const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${record.id}`;
  const requesterName = record.get("Name");
  const requesterNumber = record.get("Phone number");
  const requesterAddress = record.get("Address");

  const displayNameLink = `<${recordURL}|:heart: ${
    requesterName || "No name provided"
  }>`;
  const displayNumber = `:phone: ${getDisplayNumber(requesterNumber)}`;
  const displayAddress = `:house: ${requesterAddress || "None provided"}`;
  const displayLanguage = `:speaking_head_in_silhouette: ${getLanguage(
    record
  )}`;

  const requesterInfo = [
    heading,
    displayNameLink,
    displayNumber,
    displayAddress,
    displayLanguage,
  ];

  const requesterSection = getSection(requesterInfo.join("\n"));

  return requesterSection;
};

/**
 * Format a task to display in slack
 *
 * @param {object} record - the requested task to format
 * @returns {string} - the requested task formatted for slack
 */
const formatTasks = (record) => {
  const tasks = record.get("Tasks");
  const otherTasks = record.get("Task - other");

  if (!tasks && !otherTasks) return "None provided";

  // Put each task on a new line
  if (tasks) {
    const formattedTasks = record.get("Tasks").reduce((taskList, task) => {
      if (task !== "Other") {
        const msg = `${taskList}\n:small_orange_diamond: ${task}`;

        return msg;
      }

      let msg = `${taskList}\n:warning: _"Other" request: `;
      msg += "volunteers might not be the best match_";
      msg += `\n:small_orange_diamond: ${otherTasks}`;

      return msg;
    }, "");

    return formattedTasks;
  }
};

/**
 * Get tasks from records
 *
 * @param {object} record - the requested task to format tasks from
 * @returns {object} - Slack formatting object
 */
const getTasks = (record) => {
  const tasks = formatTasks(record);
  const tasksSection = getSection(`*Needs assistance with:* ${tasks}`);

  return tasksSection;
};

/**
 * Get subsidy
 *
 * @param {object} record The record to process for subsidies.
 * @returns {object} The object with the subsidy request.
 */
const getSubsidyRequest = (record) => {
  const subsidy = record.get(
    "Please note, we are a volunteer-run organization, but may be able to help offset some of the cost of hard goods. Do you need a subsidy for your assistance?"
  )
    ? ":white_check_mark:"
    : ":no_entry_sign:";

  const subsidySection = getSection(`*Subsidy requested:* ${subsidy}`);

  return subsidySection;
};

/**
 * Get timeframe of the request.
 *
 * @param {object} record The Airtable record to process.
 * @returns {object} The timeframe object.
 */
const getTimeframe = (record) => {
  const timeframe = record.get("Timeframe");
  const timeframeSection = getSection(
    `*Requested timeframe:* ${timeframe || "None provided"}`
  );

  return timeframeSection;
};

/**
 * Truncate responses to 2000 characters. Hides the overflow in a collapsed field.
 *
 * @param {string} response The response to truncate.
 * @param {number} recordId The ID of the Airtable record.
 * @returns {string} The truncated response.
 */
const truncateLongResponses = (response, recordId) => {
  const charLimit = 2000;
  let truncatedResponse;

  if (response.length > 2000) {
    const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${recordId}`;

    truncatedResponse = response.substring(0, charLimit);
    truncatedResponse += `... <${recordURL}|See Airtable record for full response.>`;
  }

  return truncatedResponse || response;
};

/**
 * Format other records. A catchall for items not covered in other functions.
 *
 * @param {object} record The Airtalbe record to process.
 * @returns {object} The requested record formatted for slack.
 */
const getAnythingElse = (record) => {
  const anythingElse = record.get("Anything else") || "";
  const truncatedResponse = truncateLongResponses(anythingElse, record.id);

  const anythingElseSection = getSection(
    `*Other notes from requester:* \n${truncatedResponse || "None provided"}`
  );

  return anythingElseSection;
};

/**
 * Format volunteer heading for slack.
 *
 * @param {Array} volunteers The volunteers to format the heading for.
 * @returns {object} The formatted volunteer heading section object.
 */
const getVolunteerHeading = (volunteers) => {
  if (!volunteers || !volunteers.length) {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return getSection(noneFoundText);
  }
  const volunteerHeading = `*Here are the ${volunteers.length} closest volunteers:*`;
  return getSection(volunteerHeading);
};

/**
 * Format volunteer section for slack.
 *
 * @param {Array} volunteers The volunteers to format the heading for.
 * @param {Map} taskCounts A map of volunteers to the amount of their assigned tasks.
 * @returns {Array} The formatted volunteer section object.
 */
const getVolunteers = (volunteers, taskCounts) => {
  if (!volunteers || !volunteers.length || !taskCounts) {
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return [getSection(noneFoundText)];
  }

  const volunteerSections = volunteers.map((volunteer) => {
    const volunteerURL = `${config.AIRTABLE_VOLUNTEERS_VIEW_URL}/${volunteer.record.id}`;
    const volunteerLink = `<${volunteerURL}|${volunteer.Name}>`;
    const displayNumber = getDisplayNumber(volunteer.Number);
    const volunteerDistance =
      typeof volunteer.Distance === "number"
        ? `${volunteer.Distance.toFixed(2)} Mi.`
        : "Distance N/A";
    const taskCount = taskCounts.has(volunteer.Id)
      ? pluralize(taskCounts.get(volunteer.Id), "assigned task")
      : pluralize(0, "assigned task");

    const volunteerLine = `:wave: ${volunteerLink}\n 
    ${displayNumber} - ${volunteerDistance} - ${taskCount}`;
    const volunteerSection = getSection(volunteerLine);

    return volunteerSection;
  });

  return volunteerSections;
};

/**
 * Format volunteer closing section for slack.
 *
 * @param {Array} volunteers The volunteers to format the heading for.
 * @returns {object} The formatted volunteer closing section object.
 */
const getVolunteerClosing = (volunteers) => {
  if (!volunteers || !volunteers.length) {
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return getSection(noneFoundText);
  }

  const volunteerClosing =
    "_For easy copy/paste, see the reply to this message:_";

  return getSection(volunteerClosing);
};

/**
 * Format volunteer copy/paste phone numbers.
 *
 * @param {Array} volunteers The volunteers to format the heading for.
 * @returns {string} The formatted volunteer phone numbers.
 */
const getCopyPasteNumbers = (volunteers) => {
  if (!volunteers || !volunteers.length) return "No numbers to display";

  const simplePhoneList = volunteers
    .map((volunteer) => getDisplayNumber(volunteer.Number))
    .join("\n");

  return simplePhoneList;
};

module.exports = {
  getText,
  getHeading,
  getTaskOrder,
  getRequester,
  getTasks,
  getTimeframe,
  getSubsidyRequest,
  getAnythingElse,
  getVolunteerHeading,
  getVolunteers,
  getVolunteerClosing,
  getCopyPasteNumbers,
  getSection,
};
