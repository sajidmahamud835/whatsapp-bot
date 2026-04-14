import { getProDatabase } from '../db/pro-database.js';
import { flowService } from './flow-engine.js';
import { templatesService } from './templates.js';

/**
 * Seeds the database with built-in templates and flows on first run.
 * Checks a flag in the DB to avoid re-seeding.
 */
export function seedBuiltinData(): void {
  const db = getProDatabase();

  // Check if already seeded
  db.exec("CREATE TABLE IF NOT EXISTS _pro_meta (key TEXT PRIMARY KEY, value TEXT)");
  const seeded = db.prepare("SELECT value FROM _pro_meta WHERE key = 'seeded'").get() as any;
  if (seeded) return;

  // ─── 5 Built-in Templates ──────────────────────────────────────────────────

  const templates = [
    { name: 'Welcome Message', category: 'greeting', body: 'Hi {{name}}! 👋 Welcome to our service. How can we help you today?' },
    { name: 'Order Confirmation', category: 'notification', body: 'Hi {{name}}, your order #{{order_id}} has been confirmed! 🎉\n\nEstimated delivery: {{delivery_date}}\n\nThank you for your purchase!' },
    { name: 'Appointment Reminder', category: 'notification', body: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}}.\n\nPlease reply YES to confirm or NO to reschedule.' },
    { name: 'Support Response', category: 'support', body: 'Hi {{name}}, thank you for reaching out! 🙏\n\nWe\'ve received your message and our team will respond within {{hours}} hours.\n\nTicket: #{{ticket_id}}' },
    { name: 'Follow Up', category: 'sales', body: 'Hi {{name}}! Just checking in to see if you had any questions about {{product}}.\n\nWe\'re here to help! Feel free to reply anytime. 😊' },
  ];

  for (const t of templates) {
    try { templatesService.create(t); } catch { /* skip if exists */ }
  }

  // ─── 15 Built-in Flows ─────────────────────────────────────────────────────

  const flows = [
    // 1. Welcome Bot
    {
      name: 'Welcome Bot',
      description: 'Greets new contacts with a welcome message',
      trigger_type: 'starts_with',
      trigger_config: { prefix: 'hi' },
      nodes: [
        { id: 'trigger_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Message starts with "hi"' } },
        { id: 'msg_1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Welcome', message: 'Hello! 👋 Welcome to our WhatsApp service.\n\nHow can I help you today?\n\n1️⃣ Product Info\n2️⃣ Support\n3️⃣ Talk to Agent' } },
      ],
      edges: [{ id: 'e1', source: 'trigger_1', target: 'msg_1' }],
    },
    // 2. Auto-Reply Away
    {
      name: 'Auto-Reply (Away)',
      description: 'Sends away message when you are not available',
      trigger_type: 'message',
      trigger_config: {},
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Any Message' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Away Message', message: "Thanks for your message! 🙏\n\nWe're currently away but will get back to you within 24 hours.\n\nFor urgent matters, please call: +880-XXX-XXXX" } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    },
    // 3. FAQ Bot
    {
      name: 'FAQ Bot',
      description: 'Answers frequently asked questions',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['faq', 'help', 'question'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Keywords: faq, help, question' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'FAQ Menu', message: '📋 *Frequently Asked Questions*\n\n1️⃣ What are your business hours?\nMon-Fri 9AM-6PM\n\n2️⃣ How to place an order?\nVisit our website or reply ORDER\n\n3️⃣ Return policy?\n30-day money back guarantee\n\n4️⃣ Contact support?\nReply SUPPORT for live help' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    },
    // 4. Order Status Check
    {
      name: 'Order Status Check',
      description: 'Checks order status via API',
      trigger_type: 'starts_with',
      trigger_config: { prefix: 'order' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Starts with "order"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Ask Order ID', message: 'Please send your order ID and I\'ll check the status for you.' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait for Order ID' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 360 }, data: { label: 'Save Order ID', variable: 'order_id', value: '{{message}}' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 480 }, data: { label: 'Confirm', message: 'Looking up order #{{order_id}}... Please wait.' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'm2' }],
    },
    // 5. AI Customer Support
    {
      name: 'AI Customer Support',
      description: 'Uses AI to answer customer questions',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['support', 'help', 'issue', 'problem'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Support Keywords' } },
        { id: 'a1', type: 'ai_reply', position: { x: 250, y: 120 }, data: { label: 'AI Response', systemPrompt: 'You are a helpful customer support agent. Be concise and friendly.' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 240 }, data: { label: 'Tag as Support', tag: 'support' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'tag1' }],
    },
    // 6. Lead Capture
    {
      name: 'Lead Capture',
      description: 'Collects name and email from new leads',
      trigger_type: 'exact',
      trigger_config: { text: 'interested' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Exact: "interested"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 100 }, data: { label: 'Ask Name', message: "Great! We'd love to help. What's your name?" } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 200 }, data: { label: 'Wait for Name' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 300 }, data: { label: 'Save Name', variable: 'lead_name', value: '{{message}}' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 400 }, data: { label: 'Ask Email', message: 'Thanks {{lead_name}}! What\'s your email address?' } },
        { id: 'w2', type: 'wait_for_reply', position: { x: 250, y: 500 }, data: { label: 'Wait for Email' } },
        { id: 'v2', type: 'set_variable', position: { x: 250, y: 600 }, data: { label: 'Save Email', variable: 'lead_email', value: '{{message}}' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 700 }, data: { label: 'Tag Lead', tag: 'lead' } },
        { id: 'm3', type: 'send_message', position: { x: 250, y: 800 }, data: { label: 'Confirm', message: "Thanks {{lead_name}}! We'll contact you at {{lead_email}} soon. 🎉" } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'm2' }, { id: 'e5', source: 'm2', target: 'w2' }, { id: 'e6', source: 'w2', target: 'v2' }, { id: 'e7', source: 'v2', target: 'tag1' }, { id: 'e8', source: 'tag1', target: 'm3' }],
    },
    // 7. Feedback Collector
    {
      name: 'Feedback Collector',
      description: 'Collects customer feedback with rating',
      trigger_type: 'exact',
      trigger_config: { text: 'feedback' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Exact: "feedback"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Ask Rating', message: 'We value your feedback! 🌟\n\nHow would you rate your experience?\n\n1 ⭐ - Poor\n2 ⭐⭐ - Fair\n3 ⭐⭐⭐ - Good\n4 ⭐⭐⭐⭐ - Great\n5 ⭐⭐⭐⭐⭐ - Excellent' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait for Rating' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 360 }, data: { label: 'Save Rating', variable: 'rating', value: '{{message}}' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 480 }, data: { label: 'Thanks', message: 'Thank you for your {{rating}}-star rating! 🙏\n\nWould you like to leave a comment? Just type it below or say "skip".' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'm2' }],
    },
    // 8. Appointment Booking
    {
      name: 'Appointment Booking',
      description: 'Books appointments with date and time',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['book', 'appointment', 'schedule'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Booking Keywords' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Ask Date', message: '📅 Let\'s book your appointment!\n\nWhat date works for you? (e.g., March 15)' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 340 }, data: { variable: 'apt_date', value: '{{message}}' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 440 }, data: { message: 'What time? (e.g., 2:00 PM)' } },
        { id: 'w2', type: 'wait_for_reply', position: { x: 250, y: 540 }, data: { label: 'Wait' } },
        { id: 'v2', type: 'set_variable', position: { x: 250, y: 640 }, data: { variable: 'apt_time', value: '{{message}}' } },
        { id: 'm3', type: 'send_message', position: { x: 250, y: 740 }, data: { message: '✅ Appointment booked!\n\n📅 {{apt_date}} at {{apt_time}}\n\nWe\'ll send you a reminder. See you then!' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'm2' }, { id: 'e5', source: 'm2', target: 'w2' }, { id: 'e6', source: 'w2', target: 'v2' }, { id: 'e7', source: 'v2', target: 'm3' }],
    },
    // 9. Product Catalog
    { name: 'Product Catalog', description: 'Shows product categories', trigger_type: 'keyword', trigger_config: { keywords: ['products', 'catalog', 'shop', 'buy'] },
      nodes: [{ id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Product Keywords' } }, { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: '🛍️ *Our Products*\n\n📱 Electronics\n👕 Fashion\n🏠 Home & Garden\n📚 Books\n🎮 Gaming\n\nReply with a category name to browse!' } }],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }] },
    // 10. VIP Tag & Notify
    { name: 'VIP Tag & Notify', description: 'Tags contact as VIP and notifies', trigger_type: 'exact', trigger_config: { text: 'vip' },
      nodes: [{ id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Exact: "vip"' } }, { id: 'tag1', type: 'add_tag', position: { x: 250, y: 120 }, data: { tag: 'vip' } }, { id: 'm1', type: 'send_message', position: { x: 250, y: 240 }, data: { message: '⭐ Welcome to our VIP program!\n\nYou now have access to:\n• Exclusive deals\n• Priority support\n• Early access to new products\n\nThank you for being special! 💎' } }],
      edges: [{ id: 'e1', source: 't1', target: 'tag1' }, { id: 'e2', source: 'tag1', target: 'm1' }] },
    // 11. Smart Router (Condition)
    { name: 'Smart Router', description: 'Routes messages based on content', trigger_type: 'message', trigger_config: {},
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Any Message' } },
        { id: 'c1', type: 'condition', position: { x: 250, y: 120 }, data: { label: 'Contains "urgent"?', field: '{{message}}', operator: 'contains', value: 'urgent' } },
        { id: 'm1', type: 'send_message', position: { x: 80, y: 280 }, data: { label: 'Urgent', message: '🚨 Your message has been flagged as urgent. A team member will respond within 15 minutes.' } },
        { id: 'm2', type: 'send_message', position: { x: 420, y: 280 }, data: { label: 'Normal', message: 'Thanks for your message! We\'ll respond during business hours (9AM-6PM).' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'c1' }, { id: 'e2', source: 'c1', target: 'm1', sourceHandle: 'true' }, { id: 'e3', source: 'c1', target: 'm2', sourceHandle: 'false' }] },
    // 12. Delayed Follow-Up
    { name: 'Delayed Follow-Up', description: 'Sends a follow-up after a delay', trigger_type: 'exact', trigger_config: { text: 'demo' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Exact: "demo"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: 'Thanks for your interest in a demo! 🎬\n\nI\'ll send you the details shortly...' } },
        { id: 'd1', type: 'delay', position: { x: 250, y: 240 }, data: { label: '5 sec delay', seconds: 5 } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 360 }, data: { message: 'Here\'s your demo link: https://demo.example.com\n\nFeel free to explore and let us know if you have questions!' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'd1' }, { id: 'e3', source: 'd1', target: 'm2' }] },
    // 13. API Integration
    { name: 'Weather Bot', description: 'Fetches weather via API (example)', trigger_type: 'starts_with', trigger_config: { prefix: 'weather' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Starts with "weather"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: '🌤️ Checking the weather...' } },
        { id: 'h1', type: 'http_request', position: { x: 250, y: 240 }, data: { label: 'Fetch Weather', method: 'GET', url: 'https://api.open-meteo.com/v1/forecast?latitude=23.8&longitude=90.4&current_weather=true' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 360 }, data: { message: '🌡️ Weather update:\n{{http_response}}' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'h1' }, { id: 'e3', source: 'h1', target: 'm2' }] },
    // 14. Unsubscribe Handler
    { name: 'Unsubscribe Handler', description: 'Handles opt-out requests', trigger_type: 'keyword', trigger_config: { keywords: ['stop', 'unsubscribe', 'optout'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Unsubscribe Keywords' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 120 }, data: { tag: 'unsubscribed' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 240 }, data: { message: "You've been unsubscribed. 😔\n\nYou will no longer receive messages from us.\n\nReply START anytime to re-subscribe." } },
        { id: 'end1', type: 'end', position: { x: 250, y: 360 }, data: { label: 'End' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'tag1' }, { id: 'e2', source: 'tag1', target: 'm1' }, { id: 'e3', source: 'm1', target: 'end1' }] },
    // 15. AI Chatbot with Context
    { name: 'AI Chatbot', description: 'Full AI conversation with memory', trigger_type: 'starts_with', trigger_config: { prefix: 'ai' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Starts with "ai"' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: '🤖 AI Assistant activated! Ask me anything.' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait for Question' } },
        { id: 'a1', type: 'ai_reply', position: { x: 250, y: 360 }, data: { label: 'AI Answer', systemPrompt: 'You are a helpful AI assistant on WhatsApp. Be concise, use emojis, and be friendly.' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'a1' }] },
  ];

  for (const f of flows) {
    try { flowService.create(f as any); } catch { /* skip */ }
  }

  // Mark as seeded
  db.prepare("INSERT OR REPLACE INTO _pro_meta (key, value) VALUES ('seeded', ?)").run(new Date().toISOString());
}
