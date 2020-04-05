const { createLogger, format, transports } = require("winston");

const myFormat = format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
);

const logger = createLogger({
  format: format.combine(format.timestamp(), myFormat),
  transports: [new transports.Console()],
});
exports.logger = logger;
