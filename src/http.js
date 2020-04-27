const express = require("express");
const bodyParser = require("body-parser");
const { logger } = require("./logger");
const { handleButtonUpdate, slackConf } = require("./slack/reminder");

const app = express();
const port = 3000;

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
    res.sendStatus(200);
    handleButtonUpdate(body);
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
