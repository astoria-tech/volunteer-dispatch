# Environment Variables

## Summary

| Name                                    | Required | Default value |
| --------------------------------------- |:--------:| -------------:|
| `AIRTABLE_API_KEY`                      | Yes      |               |
| `AIRTABLE_BASE_ID`                      | Yes      |               |
| `AIRTABLE_REQUESTS_TABLE_NAME`          | No       | Requests      |
| `AIRTABLE_REQUESTS_VIEW_URL`            | Yes      |               |
| `AIRTABLE_VOLUNTEERS_TABLE_NAME`        | No       | Volunteers    |
| `AIRTABLE_VOLUNTEERS_VIEW_URL`          | Yes      |               |
| `GOOGLE_API_KEY`                        | See desc |               |
| `MAPQUEST_KEY`                          | See desc |               |
| `SLACK_ALERT_CHANNEL_ID`                | No       |               |
| `SLACK_CHANNEL_ID`                      | Yes      |               |
| `SLACK_XOXB`                            | Yes      |               |
| `VOLUNTEER_DISPATCH_PREVENT_PROCESSING` | No       | `false`       |
| `VOLUNTEER_DISPATCH_STATE`              | No       | NY            |

## Storing environment variables

This project supports two methods of storing environment variables.

### exports

You can use standard unix shell environment variable exports, either in
a config file or inline.

Example in `.bashrc`:

```bash
#!/bin/bash

export AIRTABLE_API_KEY=my_key
export AIRTABLE_BASE_ID=my_base_id
export MAPQUEST_KEY=my_mapquest_id
export SLACK_XOXB=my_slack_xoxb
export SLACK_CHANNEL_ID=my_channel_id
export AIRTABLE_REQUESTS_VIEW_URL=my_requests_url
export AIRTABLE_VOLUNTEERS_VIEW_URL=my_volunteers_url
```

### .env file

You can also create a `.env` file in the project root, in the form of
`NAME=VALUE`.

Example:

```sh
AIRTABLE_API_KEY=my_key
AIRTABLE_BASE_ID=my_base_id
MAPQUEST_KEY=my_mapquest_id
SLACK_XOXB=my_slack_xoxb
SLACK_CHANNEL_ID=my_channel_id
AIRTABLE_REQUESTS_VIEW_URL=my_requests_url
AIRTABLE_VOLUNTEERS_VIEW_URL=my_volunteers_url
```

This file is git ignored.

## Environment variable descriptions

### `AIRTABLE_API_KEY`

The Airtable API key associated with your application.

To retrieve, first make sure you have an Airtable account - sign up for
a free account, then fill out this form to get a year free as a relief
group: https://airtable.com/shr2yzaeJmeuhbyrD

You can see the data or make your own copy for
local development with a single click here:
https://airtable.com/universe/expOp8DfPcmAPTSOz/volunteer-dispatch

### `AIRTABLE_BASE_ID`

The unique identifier associated with the Airtable base you will use to
store the volunteer data.

To retrieve, go to the [Airtable API page](https://airtable.com/api),
click your Volunteer Dispatch base, and the ID is there.

### `AIRTABLE_REQUESTS_TABLE_NAME`

The URL for the Volunteer's tab of your Airtable base.

To retrieve go to the **Grid View** tab of the **Volunteers** table
in your **Volunteer Dispatch** base, and copy the URL (e.g.
`https://airtable.com/tbl9xI8U5heH4EoGX/viwp51zSgXEicB3wB`).

### `AIRTABLE_REQUESTS_VIEW_URL`

The URL for the Requests tab of your Airtable base.

To retrieve, go to the **Grid View** tab of the **Requests**
table in your **Volunteer Dispatch** base, and copy the URL (e.g.
`https://airtable.com/tblMSgCqcFR404rTo/viwgqR1sKrOdmB0dn`)

### `AIRTABLE_VOLUNTEERS_TABLE_NAME`

The name of the table inside your Airtable base for Volunteers.
Optional. Defaults to `Volunteers`.

### `AIRTABLE_VOLUNTEERS_VIEW_URL`

The URL for the Volunteers tab of your Airtable base.

To retrieve, go to the **Grid View** tab of the **Volunteers**
table in your **Volunteer Dispatch** base, and copy the URL (e.g.
`https://airtable.com/tbl9xI8U5heH4EoGX/viwp51zSgXEicB3wB`)

### `GOOGLE_API_KEY`

ℹ️ The bot will always use Google data if this key is provided,
overriding `MAPQUEST_KEY`, if present.

Your Google API key, used to get geo-locating data to match volunteers
to people in need based on proximity.

### `MAPQUEST_KEY`

ℹ️  MapQuest data will only be used if no `GOOGLE_API_KEY` is preset.

Your MapQuest API key, used to get geo-locating data to match volunteers
to people in need based on proximity.

To retrieve, first make sure you have a free MapQuest dev account -
https://developer.mapquest.com/plan_purchase/steps/business_edition/business_edition_free/register.
Then, create or retrieve the API key generated for your application
under My Keys.

### `SLACK_ALERT_CHANNEL_ID`

A Slack channel ID to send bot errors. Optional.

### `SLACK_CHANNEL_ID`

The Slack channel ID that messages will be posted to (e.g. `C0107MVRF08`).

### `SLACK_XOXB`

The Slack bot token. To setup: create an app, add the OAuth `chat:write` bot
scope, install the app to a channel, and grab the bot token.

Note that the Slack token will be the same for local development and
for production, so this token may already exist. Check with your system
administrator if applicable.

### `VOLUNTEER_DISPATCH_PREVENT_PROCESSING`

Prevent processing of records. Used to sequence bot pull requests.
Optional. Defaults to `false`.

### `VOLUNTEER_DISPATCH_STATE`

The two-letter state code where your volunteer effort is located.
Optional. Defaults to NY.
