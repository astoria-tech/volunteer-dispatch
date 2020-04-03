const Slack = require('slack');

const token = process.env.SLACK_XOXB;
const channel = process.env.SLACK_CHANNEL_ID;
const bot = new Slack({ token });

const getErrand = record => {
  // Prepare the general info
  const profileURL = `https://airtable.com/tblaL1g6IzH6uPclD/viwEjCF8PkEfQiLFC/${record.id}`;
  const header = [
    `<${profileURL}|${record.get('Name')}>`,
    record.get('Phone number'),
    record.get('Address'),
  ];
  const errandObject = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: header.join('\n'),
    },
  };

  return errandObject;
};

const getVolunteers = volunteers => {
  // Find the closest volunteers
  const volObject = [];

  if (volunteers.length > 0) {
    // Header
    volObject.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Here are the 10 closest volunteers*',
      },
    });

    // Prepare the verbose volunteer info
    volunteers.forEach((volunteer) => {
      const volunteerURL = `https://airtable.com/tblxqtMAabmJyl98c/viwNYMdylPukGiOYQ/${volunteer.record.id}`;
      volObject.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${volunteerURL}|${volunteer.Name}> - ${volunteer.Number} - ${volunteer.Distance.toFixed(2)} Mi.`,
        },
      });
    });

    const msg = 'Here are the volunteer phone numbers for easy copy/pasting:';
    volObject.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [msg].concat(volunteers.map((v) => v.Number)).join('\n'),
      },
    });
  } else {
    // No volunteers found
    volObject.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*' },
    });
  }

  return volObject;
};

// Gets list of tasks from spreadsheet and adds to message text
const formatTasks = row => {
  let formattedTasks = '';

  const tasks = row.get('Tasks');
  if (tasks) {
    formattedTasks = row.get('Tasks').reduce((msg, task) => `${msg}\n :small_orange_diamond: ${task}`, '');
  }

  return formattedTasks;
};

const getTask = record => {
  // Process the requested tasks
  const taskObject = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Needs assistance with:*${formatTasks(record)}`,
    },
  };

  return taskObject;
};

// This function actually sends the message to the slack channel
const sendMessage = (record, volunteers) => {
  const errand = getErrand(record);
  const task = getTask(record);
  const vols = getVolunteers(volunteers);

  return bot.chat.postMessage({
    token,
    channel,
    text: '',
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':exclamation: *A new errand has been added!* :exclamation:',
      },
    },
    errand,
    task,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    }],
    attachments: [{ blocks: vols }],
  });
};

module.exports = {
  sendMessage,
};
