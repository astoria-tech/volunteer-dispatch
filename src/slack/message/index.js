require("dotenv").config();
const config = require("../../config");
const { getDisplayNumber } = require("./phone-number-utils");

const getSection = (text) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

const getHeading = () => {
  const text = "A new errand has been added";
  const headingSection = getSection(`:exclamation: *${text}* :exclamation:`);

  return headingSection;
};

const pluralize = (num, str) => {
  const sMaybe = num === 1 ? "" : "s";
  return `${num} ${str}${sMaybe}`;
};

const getLanguage = (record) => {
  const languages = [record.get("Language"), record.get("Language - other")];
  const languageList = languages.filter((language) => language).join(", ");

  const formattedLanguageList = `${
    languageList.length ? languageList : "None specified"
  }`;

  return formattedLanguageList;
};

const getRequester = (record) => {
  const heading = "*Requester:*";
  const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${record.id}`;
  const requesterName = record.get("Name");
  const requesterNumber = record.get("Phone number");
  const requesterAddress = record.get("Address");

  const displayNameLink = `<${recordURL}|:heart: ${requesterName}>`;
  const displayNumber = `:phone: ${getDisplayNumber(requesterNumber)}`;
  const displayAddress = `:house: ${requesterAddress}`;
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

const formatTasks = (record) => {
  const tasks = record.get("Tasks");
  const otherTasks = record.get("Task - other");

  // Put each task on a new line
  let formattedTasks = "";
  if (tasks) {
    formattedTasks = record.get("Tasks").reduce((taskList, task) => {
      let msg = `${taskList}\n :small_orange_diamond: ${task}`;
      if (task === "Other") {
        msg +=
          '\n\t\t:warning: Because this is an "Other" request, these volunteer matches might not be the best options, depending on what the request is. :warning:';
      }
      return msg;
    }, "");
  }

  if (otherTasks) {
    formattedTasks += `\n :small_orange_diamond: ${otherTasks}`;
  }

  return formattedTasks;
};

const getTasks = (record) => {
  const tasks = formatTasks(record);
  const tasksObject = getSection(`*Needs assistance with:*${tasks}`);

  return tasksObject;
};

const getSubsidyRequest = (record) => {
  const subsidy = record.get(
    "Please note, we are a volunteer-run organization, but may be able to help offset some of the cost of hard goods. Do you need a subsidy for your assistance?"
  )
    ? ":white_check_mark:"
    : ":no_entry_sign:";

  const subsidyObject = getSection(`*Subsidy requested:* ${subsidy}`);

  return subsidyObject;
};

const getTimeframe = (record) => {
  const timeframe = record.get("Timeframe");
  const timeframeObject = getSection(`*Requested timeframe:* ${timeframe}`);

  return timeframeObject;
};

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

const getAnythingElse = (record) => {
  const anythingElse = record.get("Anything else") || "";
  const truncatedResponse = truncateLongResponses(anythingElse, record.id);

  const anythingElseObject = getSection(
    `*Other notes from requester:* \n${truncatedResponse || "None"}`
  );

  return anythingElseObject;
};

const getVolunteerHeading = (volunteers) => {
  if (volunteers.length === 0) {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return getSection(noneFoundText);
  } else {
    const volunteerHeading = `*Here are the ${volunteers.length} closest volunteers:*`;
    return getSection(volunteerHeading);
  }
};

const getVolunteers = (volunteers, taskCounts) => {
  if (!volunteers.length) return;

  const volunteerSections = volunteers.map((volunteer) => {
    const volunteerURL = `${config.AIRTABLE_VOLUNTEERS_VIEW_URL}/${volunteer.record.id}`;
    const volunteerLink = `<${volunteerURL}|${volunteer.Name}>`;
    const displayNumber = getDisplayNumber(volunteer.Number);
    const volunteerDistance =
      typeof volunteer.Distance === "number"
        ? `${volunteer.Distance.toFixed(2)} Mi.`
        : "Distance N/A";
    const volunteerLanguage = volunteer.Language
    const taskCount = taskCounts.has(volunteer.Id)
      ? pluralize(taskCounts.get(volunteer.Id), "assigned task")
      : pluralize(0, "assigned task");

    const volunteerLine = `:wave: ${volunteerLink}\n ${displayNumber} - ${volunteerDistance} - :speaking_head_in_silhouette: ${volunteerLanguage}\n ${taskCount}\n`;
    const volunteerSection = getSection(volunteerLine);

    return volunteerSection;
  });

  return volunteerSections;
};

const getVolunteerClosing = (volunteers) => {
  if (!volunteers.length) return;

  const volunteerClosing =
    "_For easy copy/paste, see the reply to this message:_";

  return getSection(volunteerClosing);
};

const getCopyPasteNumbers = (volunteers) => {
  const simplePhoneList = volunteers
    .map((volunteer) => getDisplayNumber(volunteer.Number))
    .join("\n");

  return simplePhoneList || "No numbers to display!";
};

module.exports = {
  getHeading,
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
