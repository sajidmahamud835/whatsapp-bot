const express = require('express');
const whatsapp = require('whatsapp-web.js');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const qrcode = require('qrcode');
const cors = require("cors");
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    },
});
let qr_data = null;

client.initialize();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    app.get('/', (req, res) => {
        res.send('API is not running! Please scan the QR code to login. <a href="/qr">Click here</a>');
    });
    qrcode.toDataURL(qr, function (err, url) {
        qr_data = url;
    });
    app.get('/qr', (req, res) => {

        res.send(`
        <h1>Scan the QR code</h1>
        <img src=${qr_data} />
        <p>Scan the QR code above to login</p>

        <script>
            setTimeout(function() {
                window.location.reload(1);
            }, 5000);
        </script>
        `);
    });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('ready', () => {
    console.log('Client is ready!');
    app.get('/', (req, res) => {
        res.send('API is running!');
    });


    app.post('/send', async (req, res) => {
        try {
            const number = req.body.number;
            const message = req.body.message;
            const send = await client.sendMessage(number, message);
            res.send(send);
            console.log(send);
        }
        catch (error) {
            console.log(error);
        }
    });


    // https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png


    app.post('/sendMedia', async (req, res) => {
        const number = req.body.number;
        if (!req.body.mediaUrl) {
            res.send('Please provide a media URL');
        }
        const media = await MessageMedia.fromUrl(req.body.mediaUrl);
        const send = await client.sendMessage(number, media);
        res.send(send);
        console.log(send);
    });

    app.get('/getChats', async (req, res) => {
        const chats = await client.getChats();
        res.send(chats);
    });

    const messageObj = [
        {id: 1, msgBody: ["hello", "hi", "what's up"] , msgReply: ["hi", "hello", "nice to meete you :)"]},
        {id: 2, msgBody: ["how are you", "tell me about your self"] , msgReply: ["I am fine", "Fine", "I am fine what about you :)"]},
        {id: 2, msgBody: ["what are you doing", "doing"] , msgReply: ["I am eating", "I am chatting"]},
    ]

//     testing function
//     const testMessage = (clientMsg) => {
//         messageObj.map(({msgBody, msgReply}) => {
//             msgBody.forEach((item) => {
//                 if (item == clientMsg.toLowerCase()) {
//                     console.log(msgReply[Math.floor(Math.random()*msgReply.length)]);
//                 }
//             })
//         })
//     }
// let randomReply = msgReply[Math.floor(Math.random()*msgReply.length)]
// do{
//     randomReply = msgReply[Math.floor(Math.random()*msgReply.length)]
// } while(replyedMsg !== randomReply)
// replyedMsg = randomReply;
// msg.reply(replyedMsg);
// testMessage("Hello")


    app.get('/getChatMessages/:id', async (req, res) => {
        if (!req.params.id) {
            res.send('Please provide a chat ID');
        }
        const chat = await client.getChatById(req.params.id);
        const messages = await chat.fetchMessages();
        res.send(messages);
    });


    client.on('message', async (msg) => {
        console.log('MESSAGE RECEIVED', msg);
        // auto reply

        messageObj.map(({msgBody, msgReply}) => {
            msgBody.forEach((item) => {
                if (item.toLowerCase() == msg.body.toLowerCase() ) {
                    msg.reply(msgReply[Math.floor(Math.random()*msgReply.length)]);
                }
            })
        })

        // if (msg.body == '!test') {
        //     msg.reply('The bot is working!');
        // }

        // if (msg.body == 'Hi') {
        //     msg.reply('Hello');
        // }

        // if (msg.body == 'How are you?') {
        //     msg.reply('Fine');
        // }




        try {
            // send a post request to external API example
            const server_url = 'https://example.com';
            const axios = require('axios');
            const data = JSON.stringify({
                ...msg
            });

            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const response = await axios.post(server_url, data, config);
            console.log(response.data);
        }
        catch (error) {

        }

    });

    client.on('disconnected', (reason) => {
        app.get('/', (req, res) => {
            res.send('Client was logged out', reason);
        });
    });

});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}
);