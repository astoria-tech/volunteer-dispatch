const Transport = require("winston-transport");
const { sendError } = require("../slack/sendError");

/**
 * Inherit from `winston-transport` so you can take advantage
 * of the base functionality and `.exceptions.handle()`.
 */
module.exports = class SlackErrorTransport extends Transport {
  // constructor(opts) {
  //   super(opts);
  //   //
  //   // Consume any custom options here. e.g.:
  //   // - Connection information for databases
  //   // - Authentication information for APIs (e.g. loggly, papertrail,
  //   //   logentries, etc.).
  //   //
  // }

  /**
   * Log info.
   *
   * @param {string} info The information to log.
   * @param {Function} callback The function to call after logging.
   * @returns {void}
   */
  async log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Perform the writing to the remote service
    await sendError(info);

    callback();
  }
};
