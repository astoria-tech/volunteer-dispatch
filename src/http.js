const express = require("express");
const { logger } = require("./logger/");

const app = express();
const port = 3000;

app.get("/", (req, res) => res.send("ok"));

function run() {
  app.listen(port, () =>
    logger.info(`Health check running: http://localhost:${port}`)
  );
}

module.exports = {
  run,
};
