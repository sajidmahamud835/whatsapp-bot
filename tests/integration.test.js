const request = require('supertest');

// Mocks must be defined BEFORE requiring the app
const mockSendMessage = jest.fn().mockResolvedValue({ id: { fromMe: true }, body: 'Message sent' });
const mockInitialize = jest.fn();
const mockOn = jest.fn();
const mockDestroy = jest.fn();
const mockGetChats = jest.fn().mockResolvedValue([{ id: '123', name: 'Test Chat' }]);
const mockGetChatById = jest.fn();

// Mock whatsapp-web.js Client
jest.mock('whatsapp-web.js', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            return {
                initialize: mockInitialize,
                on: mockOn,
                destroy: mockDestroy,
                sendMessage: mockSendMessage,
                getChats: mockGetChats,
                getChatById: mockGetChatById,
                // Simulate properties
                isReady: false,
                authInfo: null
            };
        }),
        LocalAuth: jest.fn(),
        MessageMedia: {
            fromUrl: jest.fn().mockResolvedValue('mock-media')
        }
    };
});

const app = require('../app');

describe('WhatsApp Bot Integration Tests', () => {

    // We don't clear mocks automatically because we need the history of 'on' calls
    // that happened during module loading to trigger events.
    // beforeEach(() => {
    //    jest.clearAllMocks();
    // });

    // Manually clear specific operational mocks if needed
    beforeEach(() => {
        mockSendMessage.mockClear();
        // mockOn is NOT cleared intentionally
    });

    describe('General Endpoints', () => {
        it('GET /post with valid key should return index.html', async () => {
            // Need to set process.env.KEY if it's not set
            process.env.KEY = 'valid-key';
            const res = await request(app).get('/post?key=valid-key');
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/html/);
        });

        it('GET /post with invalid key should return error message', async () => {
            process.env.KEY = 'valid-key';
            const res = await request(app).get('/post?key=invalid');
            expect(res.statusCode).toBe(200);
            expect(res.text).toBe('Invalid key');
        });
    });

    describe('Client Management', () => {
        it('GET /1 should return not running message initially', async () => {
            const res = await request(app).get('/1');
            expect(res.text).toContain('API is not running');
        });

        it('GET /1/init should initialize the client', async () => {
            const res = await request(app).get('/1/init');
            expect(mockInitialize).toHaveBeenCalled();
            expect(res.text).toBe('Client is initializing');
        });
    });

    describe('Messaging', () => {
        it('POST /1/send should send message if client is ready', async () => {
            // Because app.js initializes multiple clients, we need to find the 'ready' callback specifically for client 1
            // or just trigger all of them to be safe and register all routes.

            mockOn.mock.calls.forEach(call => {
                if (call[0] === 'ready') {
                    // Execute the callback to register the routes for this client
                    call[1]();
                }
            });

            // Now try to send a message via Client 1
            const res = await request(app)
                .post('/1/send')
                .send({ number: '1234567890@c.us', message: 'Hello Jest' });

            expect(mockSendMessage).toHaveBeenCalledWith('1234567890@c.us', 'Hello Jest');
            expect(res.statusCode).toBe(200);
        });
    });

    describe('Auto Reply Logic', () => {
        it('should reply "Hello" when message body is "Hi"', () => {
            // Find the 'message' event handler and trigger all of them
            // In a real scenario, this would mean ALL bots reply if they receive "Hi".

            let messageCallback;
            mockOn.mock.calls.forEach(call => {
                if (call[0] === 'message') {
                    messageCallback = call[1];
                    const mockMsg = {
                        body: 'Hi',
                        reply: jest.fn()
                    };
                    // Invoke the handler
                    messageCallback(mockMsg);
                    expect(mockMsg.reply).toHaveBeenCalledWith('Hello');
                }
            });
        });

        it('should reply "Fine" when message body is "How are you?"', () => {
            // Find the 'message' event handler and trigger all
            mockOn.mock.calls.forEach(call => {
                if (call[0] === 'message') {
                    const messageCallback = call[1];
                    const mockMsg = {
                        body: 'How are you?',
                        reply: jest.fn()
                    };
                    messageCallback(mockMsg);
                    expect(mockMsg.reply).toHaveBeenCalledWith('Fine');
                }
            });
        });
    });
});
