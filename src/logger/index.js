const { createLogger, format, transports } = require("winston");
const SlackErrorTransport = require("./slack-error-transport");

/**
 * Format log message.
 *
 * @param {Date} timestamp Current unix timestamp.
 * @param {string} level The log level. Can be 'error', 'warning', 'info', or 'debug'.
 * @param {string} message The message to log.
 * @param {object} stack The stack trace.
 * @returns {string} The formatted log entry.
 */
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
