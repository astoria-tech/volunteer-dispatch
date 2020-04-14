/* eslint-disable prefer-destructuring */
const express = require("express");
const bodyParser = require("body-parser");
const { logger } = require("./logger");
const { slackConf } = require("./slack/index");
const { getButtons } = require("./slack/dispatch");
const { handleButtonUpdate } = require("./slack/dispatch");

const app = express();
const port = 3000;
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.get("/", (req, res) => res.send("ok"));

app.post("/slack/actions/", (req, res) => {
  if (slackConf(req)) {
    const body = JSON.parse(req.body.payload);
    res.sendStatus(200);
    let updateObj;
    switch (body.actions[0].block_id) {
      case "followup":
        updateObj = getButtons(1);
        break;
      case "calendar":
        updateObj = getButtons(2);
        break;
      case "time":
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
