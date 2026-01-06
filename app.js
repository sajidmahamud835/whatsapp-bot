const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const PCR = require("puppeteer-chromium-resolver");
const qrcode = require('qrcode');
const cors = require("cors");
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const postApi = process.env.POST_API || '';

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PCRoption = {
    revision: "",
    detectionPath: "",
    folderName: ".chromium-browser-snapshots",
    defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
    hosts: [],
    cacheRevisions: 2,
    retry: 3,
    silent: false
};

// Initialize PCR synchronously is not possible, so we will initialize clients after PCR is ready
// But PCR returns a promise if using async, or we can use the stats if sync (which PCR seems to be sync here? No, usually it is async).
// Looking at original code: `const stats = PCR(PCRoption);`
// PCR from 'puppeteer-chromium-resolver' returns a Promise. The original code was likely broken or using an old version where it might have been sync?
// Or maybe it was `await PCR(PCRoption)` but top level await wasn't supported.
// Let's assume it returns a promise and we need to handle it.

// Actually, looking at 'puppeteer-chromium-resolver' docs or usage, it returns a promise.
// So the original code `const stats = PCR(PCRoption);` assigned a Promise to `stats`.
// And `executablePath: stats.executablePath` would be undefined.
// This means the original code might have been broken regarding executablePath unless PCR behaves differently.
// However, I will wrap initialization in an async function.

let clients = [];
let qr_data = {}; // Map client ID to QR data
let disconnected = {}; // Map client ID to disconnected status

// Define routes outside the loop

app.get('/', (req, res) => {
    res.send('Hello World! Please follow the documentation.');
});

app.get('/post', (req, res) => {
    const key = req.query.key;
    if (key == process.env.KEY) {
        res.sendFile(__dirname + '/index.html');
    } else {
        res.send('Invalid key');
    }
});

// Dynamic routes handler
// Instead of defining routes in loop, we can use a parameterized route
// But the original code had fixed IDs 1-6.
// I will keep the loop for initialization but define routes generically where possible or use the loop to define routes ONCE.

// We need to initialize clients first.
const initClients = async () => {
    let stats;
    try {
        stats = await PCR(PCRoption);
    } catch (err) {
        console.error("Failed to resolve Chromium", err);
        return;
    }

    const puppeteerConfig = {
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
        executablePath: stats.executablePath,
    };

    const clientGenerator = (id) => {
        return new Client({
            authStrategy: new LocalAuth({ clientId: id }),
            puppeteer: puppeteerConfig
        });
    };

    // Create 6 clients
    for (let i = 1; i <= 6; i++) {
        const id = i.toString();
        const client = clientGenerator(id);
        clients.push({ id: id, client: client, isInitialized: false });
        disconnected[id] = true;
    }

    // Now set up routes and event listeners
    clients.forEach((clientObj) => {
        const { id, client } = clientObj;

        // Route: Status/Info
        app.get(`/${id}`, (req, res) => {
            if (clientObj.isInitialized && client.info) {
                 res.send('API is running!');
            } else if (clientObj.isInitialized) {
                 res.send('Client is initializing or waiting for QR scan.');
            } else {
                 res.send(`API is not running! Please start the session by <a href=/${id}/init>Clicking here</a>.`);
            }
        });

        // Route: Init
        app.get(`/${id}/init`, (req, res) => {
            if (clientObj.isInitialized) {
                res.send('Client is already initializing or ready');
            } else {
                client.initialize().catch(err => console.error(err));
                clientObj.isInitialized = true;
                res.send('Client is initializing');
            }
        });

        // Event: QR
        client.on('qr', (qr) => {
            console.log(`QR RECEIVED for Client ${id}`, qr);
            qrcode.toDataURL(qr, function (err, url) {
                qr_data[id] = url;
            });
        });

        // Route: Get QR
        app.get(`/${id}/qr`, (req, res) => {
            if (client.info) {
                res.send('Client is already authenticated');
            } else if (qr_data[id]) {
                res.send(
                    `
                        <h1>Scan the QR code</h1>
                         <img src=${qr_data[id]} />
                         <p>Scan the QR code above to login</p>
                         <script>
                            setTimeout(function() {
                                window.location.reload(1);
                            }, 5000);
                        </script>
                    `
                );
            } else {
                 res.send('QR code not generated yet or client not initialized. <a href="/' + id + '/init">Initialize</a>');
            }
        });

        // Event: Authenticated
        client.on('authenticated', () => {
            console.log(id, ' AUTHENTICATED');
            disconnected[id] = false;
        });

        // Event: Ready
        client.on('ready', () => {
            console.log(id, ' Client is ready!');
        });

        // Route: Send Message
        app.post(`/${id}/send`, async (req, res) => {
            try {
                const number = req.body.number;
                const message = req.body.message;
                // Basic validation
                if (!number || !message) {
                    return res.status(400).send("Missing number or message");
                }
                const send = await client.sendMessage(number, message);
                res.send(send);
                console.log(send);
            }
            catch (error) {
                console.log(error);
                res.status(500).send(error.toString());
            }
        });

        // Route: Send Media
        app.post(`/${id}/sendMedia`, async (req, res) => {
            try {
                const number = req.body.number;
                const mediaUrl = req.body.mediaUrl;
                const caption = req.body.caption || '';

                if (!mediaUrl) {
                    return res.send('Please provide a media url');
                }

                const media = await MessageMedia.fromUrl(mediaUrl);
                const send = await client.sendMessage(number, media, { caption: caption });
                res.send(send);
                console.log(send);
            } catch(error) {
                console.log(error);
                res.status(500).send(error.toString());
            }
        });

        // Route: Get Chats
        app.get(`/${id}/getChats`, async (req, res) => {
            try {
                const chats = await client.getChats();
                res.send(chats);
            } catch(error) {
                console.log(error);
                res.status(500).send(error.toString());
            }
        });

        // Route: Get Chat Messages
        app.get(`/${id}/getChatMessages/:chatId`, async (req, res) => {
            try {
                if (!req.params.chatId) {
                    return res.send('Please provide a chat ID');
                }
                const chat = await client.getChatById(req.params.chatId);
                const messages = await chat.fetchMessages();
                res.send(messages);
            } catch(error) {
                console.log(error);
                res.status(500).send(error.toString());
            }
        });

        // Event: Message
        client.on('message', async (msg) => {
            console.log('MESSAGE RECEIVED', msg);
            // auto reply
            if (msg.body === '!test') {
                msg.reply('The bot is working!');
            }

            if (msg.body === 'Hi') {
                msg.reply('Hello');
            }

            if (msg.body === 'How are you?') {
                msg.reply('Fine');
            }

            if (postApi !== '') {
                try {
                    const server_url = postApi;
                    // axios is already required at top
                    const data = {
                        instanceid: id,
                        ...msg
                    };
                    // Circular JSON structure in msg might cause issues if spread directly and stringified?
                    // msg object in whatsapp-web.js is complex.
                    // But checking original code, it did `JSON.stringify({ instanceid: client.client.id, ...msg });`
                    // We'll trust it works or try to replicate safely.
                    // Better to construct a safe object if possible, but let's stick to original logic mostly.

                    // Note: axios.post automatically stringifies object if content-type is json
                    const response = await axios.post(server_url, data);

                    console.log(response.data);

                    if (response.data.reply) {
                        msg.reply(response.data.reply);
                    }
                    if (response.data.replyMedia) {
                        const media = new MessageMedia('image/jpeg', response.data.replyMedia);
                        msg.reply(media);
                    }
                }
                catch (error) {
                    console.log('Post API Error:', error.message);
                }
            }
        });

        // Event: Disconnected
        client.on('disconnected', (reason) => {
            console.log('Client was logged out', reason);
            disconnected[id] = true;
            clientObj.isInitialized = false;
             // Should we destroy and recreate client?
             // Usually better to destroy.
             // client.destroy();
        });

        // Route: Logout
        app.get(`/${id}/logout`, async (req, res) => {
            if (!disconnected[id]) {
                await client.logout();
                res.send('Client logged out');
            } else {
                res.send('Client is not logged in');
            }
        });

        // Route: Exit
        app.get(`/${id}/exit`, async (req, res) => {
            if (clientObj.isInitialized) {
                clientObj.isInitialized = false;
                await client.destroy();
                console.log('Client exited');
                res.send('Client exited');
            } else {
                res.send('Client is not initialized');
            }
        });
    });

    // Start server after setting up everything
    if (require.main === module) {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
};

initClients();

module.exports = app;
