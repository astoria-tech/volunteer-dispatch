const { createLogger, format, transports } = require("winston");
const SlackErrorTransport = require("./slack-error-transport");

const myFormat = format.printf(({ timestamp, level, message, stack }) => {
  return `${timestamp} ${level}: ${message} ${stack ? `\n ${stack}` : ""}`;
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
