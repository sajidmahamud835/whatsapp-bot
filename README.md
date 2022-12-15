# whatsapp-bot
A WhatsApp-bot that automatically replies WhatsApp messages.

## Install
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install [Yarn](https://yarnpkg.com/en/docs/install)
3. Install [Git](https://git-scm.com/downloads)
4. Clone this repository with cmd or tarminal command ```git clone https://github.com/sajidmahamud835/whatsapp-bot.git``` in the folder you want to install the bot
5. Run `yarn install` in the repository folder
6. Run `yarn start` in the repository folder

## Usage
1. Scan the QR code with your phone.
2. Send a message to the phone number you are using with the bot (e.g. "Hi").
3. The bot will reply with predefined messages (e.g. "Hello").
4. The bot will automatically post all messages to the api you provided, and will reply with the response from the api.
5. You can start the instance with ``/{instance_id}/init`` (GET method).
6. You can stop the instance with ``/{instance_id}/stop`` (GET method).
7. You can login with ``/{instance_id}/qr`` (GET method).
8. You can logout with ``/{instance_id}/logout`` (GET method).
9. You can send a message to the bot with ``/{instance_id}/send`` (POST method). The bot will send the message from the phone number you are using with the bot.
10. You can get all chats with ``/{instance_id}/getChats`` (GET method).
11. You can get all messages from a chat with ``/{instance_id}/getChatMessages`` (GET method).

## API
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

## Features
- [x] Send a message to the bot
- [x] Get all chats
- [x] Get all messages from a chat
- [x] Automatically post all messages to the api you provided, and will reply with the response from the api


## License
[GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Authors
- [Sajid Mahamud](https://github.com/sajidmahamud835)

## Contributors
- [Sajid Mahamud](https://github.com/sajidmahamud835)
- 
Add your name here if you contribute to this project.

## Contact
- [Facebook](https://www.facebook.com/sajidbzs)
- [Instagram](https://www.instagram.com/sajidmahamud835)
- [LinkedIn](https://www.linkedin.com/in/sajidmahamud835)