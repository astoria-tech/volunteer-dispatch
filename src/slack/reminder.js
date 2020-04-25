const Airtable = require("airtable");

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");

const config = require("../config");

const slackSecret = config.SLACK_SIGNING_SECRET;

const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);

/**
 * Function that takes in date and time from slack buttons and returns date/time in ms
 *
 * @param {string} date Date and time from slack.
 * @returns {Date} The date and time in milliseconds.
 */
const convertDate = (date) => {
  const dateArr = date.split("-");
  return Date.parse(`${dateArr[1]} ${dateArr[2]} ${dateArr[0]}`) + 28800000;
};

/**
 * Convert specific time strings to unix timestamps.
 *
 * @param {string} time The time to process. Can be 8am, 12pm, 4pm, or 8pm.
 * @returns {Date} Time in miliseconds.
 */
const convertTime = (time) => {
  let timeInMils = 0;
  switch (time) {
    case "8am":
      timeInMils = 0;
      break;
    case "12pm":
      timeInMils = 14400000;
      break;
    case "4pm":
      timeInMils = 28800000;
      break;
    case "8pm":
      timeInMils = 43200000;
      break;
    default:
      break;
  }
  return timeInMils;
};

/**
 * Function that confirms our slack button requests are actually from slack.
 *
 * @param {object} req The request object.
 * @returns {boolean} True if from slack, false otherwise.
 */
const slackConf = (req) => {
  const reqBody = qs.stringify(req.body, { format: "RFC1738" });
  const timeStamp = req.headers["x-slack-request-timestamp"];
  const slackSig = req.headers["x-slack-signature"];
  if (Math.abs(Math.floor(Date.now() / 1000) - timeStamp) > 300) {
    return false;
  }
  const baseString = `v0:${timeStamp}:${reqBody}`;
  const mySecret = `v0=${crypto
    .createHmac("sha256", slackSecret)
    .update(baseString)
    .digest("hex")}`;

  if (
    crypto.timingSafeEqual(
      Buffer.from(mySecret, "utf8"),
      Buffer.from(slackSig, "utf8")
    )
  ) {
    return true;
  }
  return false;
};

/**
 * Function that updates airtable 'Reminder Date/Time',
 * and 'Reminder Posted' fields when reminder is set
 *
 * @param {number} id The Airtable ID.
 * @param {string} dateTime The time to set to.
 * @returns {void}
 */
const updateReminderDateTime = async (id, dateTime) => {
  await base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: "Grid view",
      filterByFormula: `({Record ID} = '${id}')`,
    })
    .eachPage(async (record, nextPage) => {
      if (dateTime !== "reset") {
        const oldDateTime = record[0].get("Reminder Date/Time");
        let newDateTime = 0;
        if (!oldDateTime) {
          newDateTime = dateTime;
        } else {
          newDateTime = parseInt(oldDateTime, 10) + dateTime;
        }
        record[0].patchUpdate({
          "Reminder Date/Time": newDateTime.toString(),
          "Reminder Posted": "",
        });
      } else {
        record[0].patchUpdate({
          "Reminder Date/Time": "",
          "Reminder Posted": "",
        });
      }
      nextPage();
    });
};

/**
 * Function to get date and return in correct format for slack datepicker.
 *
 * @returns {string} formatted date for slack.
 */
function getDate() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}`;
}
// array of slack reminder buttons
const followUpButton = {
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
};

const datePickerButton = {
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
};

const timeText = {
  type: "section",
  block_id: "timeText",
  text: {
    type: "mrkdwn",
    text: "What time would you like to be reminded?",
  },
};

const timePickerButton = {
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
};
const confText = {
  type: "section",
  text: {
    type: "mrkdwn",
    text: ":white_check_mark: Your follow-up reminder has been set!",
  },
};

/**
 * Function that swaps out slack reminder buttons after they've been pressed
 *
 * @param {object} body The contents of what's sent to slack.
 * @returns {void}
 */
function handleButtonUpdate(body) {
  const url = body.message.blocks[1].text.text;
  const id = url.substr(url.indexOf("rec"), 17);
  const responseUrl = body.response_url;
  const oldMessage = body.message;
  let updateObj = {};
  const newBlocks = [];
  for (let i = 0; i < oldMessage.blocks.length; i += 1) {
    switch (oldMessage.blocks[i].block_id) {
      case "followup":
        updateReminderDateTime(id, "reset");
        updateObj = datePickerButton;
        break;
      case "calendar":
        updateReminderDateTime(id, convertDate(body.actions[0].selected_date));
        updateObj = timePickerButton;
        newBlocks.push(timeText);
        break;
      case "time":
        updateReminderDateTime(id, convertTime(body.actions[0].value));
        updateObj = confText;
        newBlocks.pop();
        break;
      default:
        updateObj = oldMessage.blocks[i];
        break;
    }
    newBlocks.push(updateObj);
  }
  axios.post(responseUrl, {
    replace_original: true,
    text: oldMessage.text,
    type: "block_actions",
    blocks: newBlocks,
  });
}

module.exports = {
  followUpButton,
  handleButtonUpdate,
  slackConf,
};
