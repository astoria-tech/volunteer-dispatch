require("dotenv").config();
const config = require("../config");
const { getSection, bot, token } = require(".");
const { getDisplayNumber } = require("./message-utils");

const channel = config.SLACK_CHANNEL_ID;

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

const getLanguage = (record) => {
  const languages = [record.get("Language"), record.get("Language - other")];
  const languageList = languages.filter((language) => language).join(", ");

  const formattedLanguageList = `Speaks: ${
    languageList.length ? languageList : "None specified"
  }`;

  return formattedLanguageList;
};

const getRequester = (record) => {
  const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${record.id}`;
  const requesterNumber = record.get("Phone number");
  const displayNumber = getDisplayNumber(requesterNumber);

  const textLines = [
    "*Requester:*",
    `<${recordURL}|${record.get("Name")}>`,
    displayNumber,
    record.get("Address"),
    getLanguage(record),
  ];
  const text = textLines.join("\n");

  const requesterObject = getSection(text);

  return requesterObject;
};

const getTasks = (record) => {
  const tasks = formatTasks(record);
  const tasksObject = getSection(`*Needs assistance with:*${tasks}`);

  return tasksObject;
};

const subsidyIsRequested = (record) => {
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

const getVolunteers = (volunteers) => {
  const volObject = [];

  if (volunteers.length > 0) {
    // Heading for volunteers
    volObject.push(
      getSection(`*Here are the ${volunteers.length} closest volunteers*`)
    );

    // Prepare the detailed volunteer info
    volunteers.forEach((volunteer) => {
      const volunteerURL = `${config.AIRTABLE_VOLUNTEERS_VIEW_URL}/${volunteer.record.id}`;
      const volunteerLink = `<${volunteerURL}|${volunteer.Name}>`;
      const displayNumber = getDisplayNumber(volunteer.Number);
      const volunteerDistance = `${volunteer.Distance.toFixed(2)} Mi.`;

      const volunteerText = `${volunteerLink} - ${displayNumber} - ${volunteerDistance}`;

      volObject.push(getSection(volunteerText));
    });

    const msg = "_For easy copy/paste, see the reply to this message:_";

    volObject.push(getSection(msg));
  } else {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    volObject.push(getSection(noneFoundText));
  }

  return volObject;
};

const getCopyPasteNumbers = (volunteers) => {
  const simplePhoneList = volunteers
    .map((volunteer) => getDisplayNumber(volunteer.Number))
    .join("\n");

  return simplePhoneList;
};

// This function actually sends the message to the slack channel
const sendMessage = async (record, volunteers) => {
  const text = "A new errand has been added!";
  const heading = getSection(`:exclamation: *${text}* :exclamation:`);
  const requester = getRequester(record);
  const tasks = getTasks(record);
  const subsidyRequested = subsidyIsRequested(record);
  const requestedTimeframe = getTimeframe(record);
  const anythingElse = getAnythingElse(record);
  const space = getSection(" ");
  const volunteerList = getVolunteers(volunteers);
  const copyPasteNumbers = getCopyPasteNumbers(volunteers);

  const res = await bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: [
      heading,
      requester,
      tasks,
      requestedTimeframe,
      subsidyRequested,
      anythingElse,
      space,
      ...volunteerList,
    ],
  });

  return await bot.chat.postMessage({
    thread_ts: res.ts,
    reply_broadcast: true,
    token,
    channel,
    text: copyPasteNumbers,
  });
};

module.exports = {
  sendMessage,
};
