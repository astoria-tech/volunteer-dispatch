/* eslint-disable prefer-destructuring */
const Airtable = require("airtable");

const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const { logger } = require("./logger");
const { slackConf } = require("./slack/index");
const { getButtons, handleButtonUpdate } = require("./slack/dispatch");

const app = express();
const port = 3000;
const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);
// function that takes in date and time from slack buttons and returns date/time in ms
const convertDate = (date) => {
  const dateArr = date.split("-");
  return Date.parse(`${dateArr[1]} ${dateArr[2]} ${dateArr[0]}`) + 28800000;
};
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
// function that updates airtable 'Reminder Date/Time', and 'Reminder Posted' fields when reminder is set
const updateReminderDateTime = async (id, dateTime) => {
  await base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: "Grid view",
      filterByFormula: `({Record ID} = '${id}')`,
    })
    .eachPage(async (record, nextPage) => {
      const oldDateTime = record[0].get("Reminder Date/Time");
      let newDateTime = 0;
      if (!oldDateTime) {
        newDateTime = dateTime;
      } else {
        newDateTime = parseInt(oldDateTime) + dateTime;
      }
      record[0].patchUpdate({
        "Reminder Date/Time": newDateTime.toString(),
        "Reminder Posted": "",
      });
    });
};

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.get("/", (req, res) => res.send("ok"));

// this route is handling slack update buttons
app.post("/slack/actions/", (req, res) => {
  if (slackConf(req)) {
    const body = JSON.parse(req.body.payload);
    const url = body.message.blocks[1].text.text;
    const id = url.substr(url.indexOf("rec"), 17);
    res.sendStatus(200);
    let updateObj;
    switch (body.actions[0].block_id) {
      case "followup":
        updateObj = getButtons(1);
        break;
      case "calendar":
        updateReminderDateTime(id, convertDate(body.actions[0].selected_date));

        updateObj = getButtons(2);
        break;
      case "time":
        updateReminderDateTime(id, convertTime(body.actions[0].value));
        updateObj = getButtons(3);
        break;
      default:
        break;
    }
    handleButtonUpdate(body, updateObj);
  } else {
    res.status(400).send("Ignore this request.");
  }
});

function run() {
  app.listen(port, () =>
    logger.info(`Health check running: http://localhost:${port}`)
  );
}

module.exports = {
  run,
};
