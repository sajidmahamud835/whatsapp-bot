# whatsapp-bot
A WhatsApp-bot that automatically replies WhatsApp messages.

## Install
### Install on Local Machine / Server
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install [Yarn](https://yarnpkg.com/en/docs/install) (optional)
3. Install [Git](https://git-scm.com/downloads)
4. Place the files in the folder you want to install the bot.
5. Run `yarn install` or `npm install` in the repository folder
6. Run `yarn start` or `npm start` in the repository folder
7. Open ``http://localhost:3000`` in your browser.

### Deploy on Heroku
1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Place the files in the folder you want to install the bot.
3. Run `heroku login` in the repository folder to login to heroku.
4. Run `heroku create` in the repository folder to create a heroku app.
5. Run `git push heroku master` in the repository folder to deploy to heroku.
6. Run `heroku ps:scale web=1` in the repository folder for starting the bot.
7. Run `heroku open` in the repository folder

### Deploy on Vercel
1. Install [Vercel CLI](https://vercel.com/download)
2. Place the files in the folder you want to install the bot.
3. Run `vercel login` in the repository folder to login to vercel.
4. Run `vercel` in the repository folder to deploy to staging.
5. Run `vercel --prod` in the repository folder to deploy to production.
6. Open the link that is shown in the terminal.

### Deploy on aaPanel (Linux)
1. Install [aaPanel](https://www.aapanel.com/) on your server if you haven't already.
2. Open aaPanel and go to the "App Store" tab.
3. Search for "Node.js version manager" and install it.
4. Open aaPanel and go to the "File Manager" tab.
5. Create a new folder in the "www" folder.
6. Open the folder you created and upload the files from the repository.
7. Create a .env file in the folder you created and add the following lines to it:
```
    PORT=8585 # The port you want to run the bot on
```
8. Open aaPanel and go to the "Website" tab.
9. Click on the "Node Project" button.
10. Click on the "Add Node Project" button.
11. Select the folder you created in step 5.
12. Select the port you want to run the bot on in step 7.
13. Select a domain for the bot (optional).
14. Click on the "Confirm" button.
15. Open aaPanel and go to the "Security" tab and add the port you selected in step 12.
16. Now open the domain you selected in step 13 or the ip address of your server with the port you selected in step 12 in your browser.

## Usages
1. The bot will automatically post all messages to the api you provided, and will reply with the response from the api.
2. You can start the instance with ``/{instance_id}/init`` (GET method).
3. You can stop the instance with ``/{instance_id}/stop`` (GET method).
4. You can login with ``/{instance_id}/qr`` (GET method).
5. Scan the QR code with your phone.
6. You can logout with ``/{instance_id}/logout`` (GET method).
7. Send a message to the phone number you are using with the bot (e.g. "Hi").
8. The bot will reply with predefined messages (e.g. "Hello").
9. You can send a message with the bot with ``/{instance_id}/send`` (POST method). The bot will send the message from the phone number you are using with the bot. The body should be like this: 

```json
    {"number": "880171329xxxx@c.us", "message": "Hello"}
```

The number is the number you want to send the message to. The message is the message you want to send. The number should be in this format: ``880171329xxxx@c.us``. Here ``@c.us`` is the domain of the number. You can use ``@c.us``, ``@s.whatsapp.net``, ``@g.us``. You can use ``@c.us`` for personal chats, ``@s.whatsapp.net`` for group chats, and ``@g.us`` for broadcast lists.

10. You can send media with the bot with ``/{instance_id}/sendMedia`` (POST method). The bot will send the media from the phone number you are using with the bot. The body should be like this: 

```json
    {"number": "880171329xxxx@c.us", "mediaUrl": "https://example.com/image.jpg"}
```
10. You can get all chats with ``/{instance_id}/getChats`` (GET method).
11. You can get all messages from a chat with ``/{instance_id}/getChatMessages/{whatsapp_id}`` (GET method). The whatsapp_id is the id of the chat you want to get messages from. (e.g. `880171329xxxx@c.us`).

## API & Webhook
The bot will automatically post all messages to the api you provided, and will reply with the response from the api. The api should be a POST method with the following body:
```json
{
    "instanceid": "2",
    "_data": {
        "id": {
            "fromMe": false,
            "remote": "880171329xxxx@c.us",
            "id": "3EB0E8E1B3B9BE46xxxx",
            "_serialized": "false_880171329xxxx@c.us_3EB0E8E1B3B9BE46xxxx"
        },
        "body": "ok",
        "type": "chat",
        "t": 1671010000,
        "notifyName": "WhatsApp Bot Ltd.",
        "from": "880171329xxxx@c.us",
        "to": "880130485xxxx@c.us",
        "self": "in",
        "ack": 1,
        "isNewMsg": true,
        "star": false,
        "kicNotified": false,
        "recvFresh": true,
        "isFromTemplate": false,
        "pollInvalidated": false,
        "latestEditMsgKey": null,
        "latestEditSenderTimestampMs": null,
        "broadcast": false,
        "mentionedJidList": [],
        "isVcardOverMmsDocument": false,
        "isForwarded": false,
        "hasReaction": false,
        "ephemeralOutOfSync": false,
        "productHeaderImageRejected": false,
        "lastPlaybackProgress": 0,
        "isDynamicReplyButtonsMsg": false,
        "isMdHistoryMsg": false,
        "stickerSentTs": 0,
        "isAvatar": false,
        "requiresDirectConnection": false,
        "pttForwardedFeaturesEnabled": true,
        "isEphemeral": false,
        "isStatusV3": false,
        "links": []
    },
    "id": {
        "fromMe": false,
        "remote": "880171329xxxx@c.us",
        "id": "3EB0E8E1B3B9BE46xxxx",
        "_serialized": "false_880171329xxxx@c.us_3EB0E8E1B3B9BE46xxxx"
    },
    "ack": 1,
    "hasMedia": false,
    "body": "ok",
    "type": "chat",
    "timestamp": 1671010000,
    "from": "880171329xxxx@c.us",
    "to": "880130485xxxx@c.us",
    "deviceType": "web",
    "isForwarded": false,
    "forwardingScore": 0,
    "isStatus": false,
    "isStarred": false,
    "broadcast": false,
    "fromMe": false,
    "hasQuotedMsg": false,
    "vCards": [],
    "mentionedIds": [],
    "isGif": false,
    "isEphemeral": false,
    "links": []
}
```

You can return a response with the following body:
```json
{
    "instanceid": "2",
    "reply": "Hello",
    "replyMedia": "https://example.com/image.jpg"
}
```

## Features
- [x] Send a message to the bot.
- [x] Get all chats.
- [x] Get all messages from a chat.
- [x] Automatically post all messages to the api you provided, and will reply with the response from the api.