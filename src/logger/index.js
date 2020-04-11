const { createLogger, format, transports } = require("winston");
const SlackErrorTransport = require("./slack-error-transport");

const myFormat = format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

const logger = createLogger({
  format: format.combine(format.timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new SlackErrorTransport({ level: "error" }),
  ],
  exceptionHandlers: [new transports.Console(), new SlackErrorTransport()],
});

exports.logger = logger;
