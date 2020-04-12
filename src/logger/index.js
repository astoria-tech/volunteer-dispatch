const { createLogger, format, transports } = require("winston");
const SlackErrorTransport = require("./slack-error-transport");

const myFormat = format.printf((info) => {
  return `${info.timestamp} ${info.level}: ${info.message} ${
    info.stack ? "\n" + info.stack : ""
  }`;
});

const logger = createLogger({
  format: format.combine(format.timestamp(), format.colorize(), myFormat),
  transports: [
    new transports.Console(),
    new SlackErrorTransport({ level: "error" }),
  ],
  exceptionHandlers: [new transports.Console(), new SlackErrorTransport()],
});

exports.logger = logger;
