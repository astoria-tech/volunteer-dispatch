# How to get the API keys for your volunteer dispatch Slackbot

By the end of this tutorial, you will have set up API keys for:

- `AIRTABLE_API_KEY`
- `MAPQUEST_KEY`
- `SLACK_XOXB` - Slack bot token.
- `SLACK_CHANNEL_ID` - Slack channel ID

## 1. Get Airtable API-key

In Airtable, click in your account in the top right hand corner:

![figure 1](https://github.com/MutualAidNYC/media/blob/master/Airtable%20API%20key%201.png)

Halfway down your account overview page you can click on a grey button that says “Generate API key”

![figure 2](https://github.com/MutualAidNYC/media/blob/master/Airtable%20API%20key%202.png)

The API key is generated but hidden behind a row of doubts in the light purple box.

![figure 3](https://github.com/MutualAidNYC/media/blob/master/Airtable%20API%20key%203.png)

Hover your cursor over the dotted area to reveal the API key and copy it to a sticky or notes app.

![figure 4](https://github.com/MutualAidNYC/media/blob/master/Airtable%20API%20key%204.png)

## 2. Get Mapquest API key

When you open Mapquest, your home dashboard is a page that says “Manage Keys”. Click on the blue button on the right that says “Create a new key”.

![figure 5](https://github.com/MutualAidNYC/media/blob/master/Mapquest%20API%20key%201.png)

We will be using this API for the Slackbot volunteer app you will create so call the App Name something like “volunteer map”. You can leave the callback URL blank.

![figure 6](https://github.com/MutualAidNYC/media/blob/master/MapQuest%20API%20key%202.png)

You will be returned to your home “Manage Keys’ page. Click the triangle/arrow next to the app name “Volunteer map” to reveal your keys.  

![figure 7](https://github.com/MutualAidNYC/media/blob/master/Mapquest%20API%20key%203.png)

Your consumer key is your API key. Copy and paste this key into the notes doc where you saved the Airtable API key.

![figure 8](https://github.com/MutualAidNYC/media/blob/master/MapQuest%20API%20key%204.png)

## 3. Create a Slackbot app token.

Now we need to set up our Slack channel where the bot will live when it is doing the processing. In Slack, create a new channel by clicking the + sign next to Channels in the left-hand menu and choose “Create a channel”.

![figure 9](https://github.com/MutualAidNYC/media/blob/master/slack%201.png)

Call the channel something like slackbot-vol. Make it private.

![figure 10](https://github.com/MutualAidNYC/media/blob/master/slack%202.png)

Don’t worry about adding anyone to the channel at the moment. Click skip for now.

![figure 11](https://github.com/MutualAidNYC/media/blob/master/slack%203.png)

Your channel has now been created. You will need to have a look at it in a desktop for this next step. Open the channel in a browser and not the slack app. Look for the last set of letters and numbers in the URL after the final backslash. Copy this to your notes document, noting that this is the Slack Channel ID.

![figure 12](https://github.com/MutualAidNYC/media/blob/master/slack%204.png)

Now in the left-hand menu, click on your workspace name at the top and see the dropdown menu. Cursor over the “Settings & Administration” and click on “Manage apps”. This will open you in the browser again if you did that in the Slack app. On the top menu of that page, the button next to your workspace name says “Build”. Click on it.

![figure 13](https://github.com/MutualAidNYC/media/blob/master/slack%205.png)

Click on the green button “Start Building”.

![figure 14](https://github.com/MutualAidNYC/media/blob/master/slack%206.png)

Give your app a name (this will be your slackbot, so we called it Slackbot-vol here), make sure it is connected to the right Slack workspace, and click the green “Create app” button.

![figure 15](https://github.com/MutualAidNYC/media/blob/master/slack%207.png)

Now select “OAuth & Permissions” from the left-hand menu:

![figure 16](https://github.com/MutualAidNYC/media/blob/master/slack%208.png)

Scroll down to where it says “Scopes” and click the “Add an OAuth Scope” button.

![figure 17](https://github.com/MutualAidNYC/media/blob/master/slack%209.png)

Add a new scope as shown in the image below. Choose chat:write from the dropdown list.

![figure 18](https://github.com/MutualAidNYC/media/blob/master/slack%2010.png)

Now further down this page, you can copy the bot token:

![figure 19](https://github.com/MutualAidNYC/media/blob/master/slack%2014.png)

Copy this and put it in your notes doc.  
Now scroll up to the top of the page and click the green “Install App to Workspace” button.

![figure 20](https://github.com/MutualAidNYC/media/blob/master/slack%2012.png)

Choose the right workspace from the list and this screen will appear. Click the green “Allow” button.

![figure 21](https://github.com/MutualAidNYC/media/blob/master/slack%2013.png)

Now go back to Slack and go to the channel you created earlier (in our case that was also called slackbot-vol). Click the blue menu option “Add an app”.

![figure 22](https://github.com/MutualAidNYC/media/blob/master/slack%2011.png)

The Slackbot-vol appears in our workspace options. Click the “Add” button on the right.

![figure 23](https://github.com/MutualAidNYC/media/blob/master/slack%2015.png)

The channel will now say that the app has been added to the channel.

## 4. Add these keys to your slackbot!

The Docker Compose YAML is set up to accept your API keys from your environment. So you can load the API keys into the shell that is running your Docker Compose. When you deploy to production, your deployment tools will take the environment API keys to make sure your slackbot is integrated and able to start checking for new requests every 15 seconds.

