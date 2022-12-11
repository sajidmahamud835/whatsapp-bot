const express = require('express');
const whatsapp = require('whatsapp-web.js');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const qrcode = require('qrcode');

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
    app.get('/qr', (req, res) => {
        qrcode.toDataURL(qr, function (err, url) {
            qr_data = url;
        });

        res.send(`<img src=${qr_data} />`);
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

    app.get('/send', async (req, res) => {
        const number = '8801700614900@c.us';
        const message = '8801700614900';
        await client.sendMessage(number, message);
        res.send('Message sent!');
    });

    app.get('/sendMedia', async (req, res) => {
        const number = '8801700614900@c.us';
        const media = await MessageMedia.fromUrl('https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png');
        const send = await client.sendMessage(number, media);
        res.send('Media sent!');
        console.log('Media sent!', send);
    });

    app.get('/getChats', async (req, res) => {
        const chats = await client.getChats();
        res.send(chats);
    });

    app.get('/getChatMessages/:id', async (req, res) => {
        const chat = await client.getChatById(req.params.id);
        const messages = await chat.fetchMessages();
        res.send(messages);
    });

    client.on('message', async (msg) => {
        console.log('MESSAGE RECEIVED', msg);
        if (msg.body == '!ping') {
            msg.reply('pong');
        }
    });

    client.on('disconnected', (reason) => {
        app.get('/', (req, res) => {
            res.send('Client was logged out', reason);
        });
    });

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    }
    );

});
