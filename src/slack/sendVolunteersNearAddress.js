require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const message = require("./message");
const { followUpButton } = require("./reminder");

const channel = config.SLACK_CHANNEL_ID;

const sendVolunteersNearAddress = async volunteers => {

    // console.log('sending!', volunteers)

//   const res = await bot.chat.postMessage({
//     token,
//     channel,
//     text,
//     blocks: primaryRequestInfo,
//   });

//   const { ts } = res;
//   for (const blocks of blocksList) {
//     await bot.chat.postMessage({
//       thread_ts: ts,
//       token,
//       channel,
//       text,
//       blocks,
//     });
//   }
//   await sendCopyPasteNumbers(volunteers, ts);
};

module.exports = {
    sendVolunteersNearAddress,
};
