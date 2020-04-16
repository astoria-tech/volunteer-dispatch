/* eslint-disable prefer-destructuring */
const Airtable = require("airtable");

const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const { logger } = require("./logger");
const { slackConf } = require("./slack/index");
const { getButtons, handleButtonUpdate } = require("./slack/dispatch");

const reminderObj = { id: null, date: null, time: null };
const reminderArray = [];
const app = express();
const port = 3000;
const base = new Airtable({ apiKey: config.AIRTABLE_API_KEY }).base(
  config.AIRTABLE_BASE_ID
);
const convertDateTime = (date, time) => {
  const dateArr = date.split("-");
  let timeInMils = 0;
  switch (time) {
    case "8am":
      timeInMils = 28800000;
      break;
    case "12pm":
      timeInMils = 43200000;
      break;
    case "4pm":
      timeInMils = 57600000;
      break;
    case "8pm":
      timeInMils = 72000000;
      break;
    default:
      break;
  }
  return Date.parse(`${dateArr[1]} ${dateArr[2]} ${dateArr[0]}`) + timeInMils;
};

const updateReminderField = async (id, date) => {
  await base(config.AIRTABLE_REQUESTS_TABLE_NAME)
    .select({
      view: "Grid view",
      filterByFormula: `({Record ID} = '${id}')`,
    })
    .eachPage(async (record, nextPage) => {
      record[0].patchUpdate({
        "Reminder Date/Time": date.toString(),
      });
    });
};
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.get("/", (req, res) => res.send("ok"));

app.post("/slack/actions/", (req, res) => {
  if (slackConf(req)) {
    const body = JSON.parse(req.body.payload);
    const url = body.message.blocks[1].text.text;
    const id = url.substr(url.indexOf("rec"), 17);
    res.sendStatus(200);
    let updateObj;
    switch (body.actions[0].block_id) {
      case "followup":
        reminderObj.id = id;
        reminderObj.date = null;
        reminderObj.time = null;
        reminderArray.push({ ...reminderObj });
        updateObj = getButtons(1);
        break;
      case "calendar":
        for (let i = 0; i < reminderArray.length; i += 1) {
          if (reminderArray[i].id === id) {
            reminderArray[i].date = body.actions[0].selected_date;
          }
        }
        updateObj = getButtons(2);
        break;
      case "time":
        for (let i = 0; i < reminderArray.length; i += 1) {
          if (reminderArray[i].id === id) {
            reminderArray[i].time = body.actions[0].value;
            updateReminderField(
              reminderArray[i].id,
              convertDateTime(reminderArray[i].date, reminderArray[i].time)
            );
            reminderArray.splice(i, 1);
          }
        }
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
