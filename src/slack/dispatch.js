require("dotenv").config();
const axios = require("axios");
const config = require("../config");
const { getSection, bot, token } = require(".");

const channel = config.SLACK_CHANNEL_ID;

function getDate() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}`;
}

const slackButtons = [
  {
    blocks: [
      {
        type: "actions",
        block_id: "followup",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Flag for Follow-up?",
            },
            style: "primary",
            value: "follow_up_requested",
          },
        ],
      },
    ],
  },
  {
    blocks: [
      {
        type: "section",
        block_id: "calendar",
        text: {
          type: "mrkdwn",
          text: "Pick a date for the reminder.",
        },
        accessory: {
          type: "datepicker",
          action_id: "datepicker123",
          initial_date: `${getDate()}`,
        },
      },
    ],
  },
  {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "What time would you like to be reminded?",
        },
      },
      {
        type: "actions",
        block_id: "time",

        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "8AM",
            },
            style: "primary",
            value: "8am",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "12PM",
            },
            style: "primary",
            value: "12pm",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "4PM",
            },
            style: "primary",
            value: "4pm",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "8PM",
            },
            style: "primary",
            value: "8pm",
          },
        ],
      },
    ],
  },
  {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":white_check_mark: Your follow-up reminder has been set!",
        },
      },
    ],
  },
];

const getButtons = (index) => {
  return slackButtons[index];
};

const formatTasks = (record) => {
  const tasks = record.get("Tasks");
  const otherTasks = record.get("Task - other");

  // Put each task on a new line
  let formattedTasks = "";
  if (tasks) {
    formattedTasks = record
      .get("Tasks")
      .reduce(
        (taskList, task) => `${taskList}\n :small_orange_diamond: ${task}`,
        ""
      );
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
  const textLines = [
    "*Requester:*",
    `<${recordURL}|${record.get("Name")}>`,
    record.get("Phone number"),
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
    volObject.push(getSection("*Here are the 10 closest volunteers*"));

    // Prepare the detailed volunteer info
    volunteers.forEach((volunteer) => {
      const volunteerURL = `${config.AIRTABLE_VOLUNTEERS_VIEW_URL}/${volunteer.record.id}`;
      const volunteerText = `<${volunteerURL}|${volunteer.Name}> - ${
        volunteer.Number
      } - ${volunteer.Distance.toFixed(2)} Mi.`;

      volObject.push(getSection(volunteerText));
    });

    // Add phone number list for copy/paste
    const msg = "Here are the volunteer phone numbers for easy copy/pasting:";
    const phoneText = [msg].concat(volunteers.map((v) => v.Number)).join("\n");

    volObject.push(getSection(phoneText));
  } else {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    volObject.push(getSection(noneFoundText));
  }

  return volObject;
};

function handleButtonUpdate(body, updatedButton) {
  const responseUrl = body.response_url;
  const oldMessage = body.message;
  const newBlocks = [];
  for (let i = 0; i < oldMessage.blocks.length; i += 1) {
    newBlocks.push(oldMessage.blocks[i]);
  }
  // this fucking works but doesnt retain original message
  axios
    .post(responseUrl, {
      replace_original: true,
      text: oldMessage.text,
      type: "block_actions",
      blocks: newBlocks,
      attachments: [oldMessage.attachments[0], updatedButton],
    })
    .then((response) => console.log(JSON.parse(response.config.data)));
}

// This function actually sends the message to the slack channel
const sendMessage = (record, volunteers) => {
  const text = "A new errand has been added!";
  const heading = getSection(`:exclamation: *${text}* :exclamation:`);
  const requester = getRequester(record);
  const tasks = getTasks(record);
  const subsidyRequested = subsidyIsRequested(record);
  const requestedTimeframe = getTimeframe(record);
  const anythingElse = getAnythingElse(record);
  const space = getSection(" ");
  const volunteerList = getVolunteers(volunteers);

  return bot.chat.postMessage({
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
    ],
    attachments: [
      {
        blocks: volunteerList,
      },
      slackButtons[0],
    ],
  });
};

module.exports = {
  sendMessage,
  getButtons,
  handleButtonUpdate,
};
