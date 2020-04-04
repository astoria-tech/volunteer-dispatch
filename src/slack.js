require("dotenv").config();
const Slack = require("slack");
const token = process.env.SLACK_XOXB;
const channel = process.env.SLACK_CHANNEL_ID;
const bot = new Slack({ token });
const requestsURL = "https://airtable.com/tblaL1g6IzH6uPclD/viwEjCF8PkEfQiLFC/";

// This function actually sends the message to the slack channel
const sendMessage = (record, volunteers) => {
  const text = "A new errand has been added!";
  const heading = getSection(`:exclamation: *${text}* :exclamation:`);
  const requester = getRequester(record);
  const tasks = getTasks(record);
  const language = getLanguage(record);
  const space = getSection(" ");
  const volunteerList = getVolunteers(volunteers);

  return bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: [heading, requester, tasks, language, space],
    attachments: [
      {
        blocks: volunteerList
      }
    ]
  });
};

const getRequester = record => {
  const recordURL = `${requestsURL}${record.id}`;
  const textLines = [
    `<${recordURL}|${record.get("Name")}>`,
    record.get("Phone number"),
    record.get("Address")
  ];
  const text = textLines.join("\n");

  const requesterObject = getSection(text);

  return requesterObject;
};

const getTasks = record => {
  const tasks = formatTasks(record);
  const tasksObject = getSection(`*Needs assistance with:*${tasks}`);

  return tasksObject;
};

const getLanguage = record => {
  const language = record.get("Language");
  const languageObject = getSection(`*Speaks:* ${language}`);

  return languageObject;
};

const formatTasks = record => {
  let formattedTasks = "";
  const tasks = record.get("Tasks");

  // Put each task on a new line
  if (tasks) {
    formattedTasks = record
      .get("Tasks")
      .reduce((msg, task) => `${msg}\n :small_orange_diamond: ${task}`, "");
  }

  return formattedTasks;
};

const getVolunteers = volunteers => {
  const volObject = [];

  if (volunteers.length > 0) {
    // Heading for volunteers
    volObject.push(getSection("*Here are the 10 closest volunteers*"));

    // Prepare the detailed volunteer info
    volunteers.forEach(volunteer => {
      const volunteerURL = `https://airtable.com/tblxqtMAabmJyl98c/viwNYMdylPukGiOYQ/${volunteer.record.id}`;
      const volunteerText = `<${volunteerURL}|${volunteer.Name}> - ${
        volunteer.Number
      } - ${volunteer.Distance.toFixed(2)} Mi.`;

      volObject.push(getSection(volunteerText));
    });

    // Add phone number list for copy/paste
    const msg = "Here are the volunteer phone numbers for easy copy/pasting:";
    const phoneText = [msg].concat(volunteers.map(v => v.Number)).join("\n");

    volObject.push(getSection(phoneText));
  } else {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    volObject.push(getSection(noneFoundText));
  }

  return volObject;
};

const getSection = text => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text
    }
  };
};

module.exports = {
  sendMessage
};
