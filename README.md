# Volunteer Dispatch

A bot which locates the closest volunteers to check-in on & run errands for vulnerable members of the community.

_Made by [Astoria Tech](https://github.com/astoria-tech) volunteers, for use by the [Astoria Mutual Aid Network](https://astoriamutualaid.com)._

![](assets/banner.png)

## How it works

Astoria Mutual Aid Network’s volunteer dispatch works as follows:

- People fill out a form to request help (https://astoriamutualaid.com/help) which feeds into Airtable
- The bot (a node.js container) watches the Airtable sheet for new entries (every 15 seconds)
- When a new entry is found, the request address is cross-referenced against the volunteer list to
  find the 10 closest volunteers who can fulfill the need, and posts them to a private dispatch channel
  on Slack (where we have trained dispatch volunteers coordinating with the field volunteers).

## Software requirements

- Make
- Docker & Docker Compose

## Integration requirements

Get the integration points setup:

- an Airtable account - sign up for a free account, then fill out this form to get a year free as a relief group: https://airtable.com/shr2yzaeJmeuhbyrD
- a free MapQuest dev account - https://developer.mapquest.com/plan_purchase/steps/business_edition/business_edition_free/register
- a dedicated private Slack channel for the bot to post to

And grab the API keys from each (and channel ID for Slack), and put them into the following environment variables:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID` - go to the [Airtable API page](https://airtable.com/api), click your Volunteer Dispatch base, and the ID is there
- `AIRTABLE_REQUESTS_VIEW_URL` - go to the **Grid View** of the **Requests** table in your **Volunteer Dispatch** base, and copy the URL (e.g. `https://airtable.com/tblMSgCqcFR404rTo/viwgqR1sKrOdmB0dn`)
- `AIRTABLE_VOLUNTEERS_VIEW_URL` - go to the **Grid View** of the **Volunteers** table in your **Volunteer Dispatch** base, and copy the URL (e.g. `https://airtable.com/tbl9xI8U5heH4EoGX/viwp51zSgXEicB3wB`)
- `MAPQUEST_KEY`
- `SLACK_XOXB` - Slack bot token. To setup: create an app, add the OAuth `chat:write` bot scope, install the app to a channel, and grab the bot token
- `SLACK_SECRET` - Slack app signing secret. Found in the 'Basic Information' section of your app on api.slack.com/apps
- `SLACK_CHANNEL_ID` - Slack channel ID (e.g. `C0107MVRF08`)

## How to run

- Clone this repo and navigate to the project root in your terminal.
- Set the environment variables documented above.
- Run `make develop` and the bot will start running, processing records every 15 seconds.

## Setting up data backend

We store our data on Airtable. You can see the data and make your own copy with a single click here:
https://airtable.com/universe/expOp8DfPcmAPTSOz/volunteer-dispatch

## How we have it deployed

We use a tool called [Shipyard](https://shipyard.build) to deploy the bot. In short, it compiles
the Docker Compose file to Kubernetes manifests and deploys to a managed cluster.

Shipyard will host the bot for free for any mutual aid or relief organizations. Send a message to
[covid@shipyard.build](mailto:covid@shipyard.build) and they'll set you up with an account.
