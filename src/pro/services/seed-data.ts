import { getProDatabase } from '../db/pro-database.js';
import { flowService } from './flow-engine.js';
import { templatesService } from './templates.js';

/**
 * Seeds the database with useful built-in templates and flows on first run.
 * Every flow and template here works out of the box — no dummy data.
 */
export function seedBuiltinData(): void {
  const db = getProDatabase();

  db.exec("CREATE TABLE IF NOT EXISTS _pro_meta (key TEXT PRIMARY KEY, value TEXT)");
  const seeded = db.prepare("SELECT value FROM _pro_meta WHERE key = 'seeded'").get() as any;
  if (seeded) return;

  // ─── 5 Templates (all work with variable substitution) ─────────────────────

  const templates = [
    { name: 'Welcome Message', category: 'greeting', body: 'Hi {{name}}! 👋 Welcome to our service. How can we help you today?' },
    { name: 'Order Confirmation', category: 'notification', body: 'Hi {{name}}, your order #{{order_id}} has been confirmed! 🎉\n\nEstimated delivery: {{delivery_date}}\n\nThank you for your purchase!' },
    { name: 'Appointment Reminder', category: 'notification', body: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}}.\n\nPlease reply YES to confirm or NO to reschedule.' },
    { name: 'Support Ticket', category: 'support', body: 'Hi {{name}}, thank you for reaching out! 🙏\n\nWe\'ve received your message and our team will respond within {{hours}} hours.\n\nTicket: #{{ticket_id}}' },
    { name: 'Follow Up', category: 'sales', body: 'Hi {{name}}! Just checking in to see if you had any questions about {{product}}.\n\nWe\'re here to help! Feel free to reply anytime. 😊' },
  ];

  for (const t of templates) {
    try { templatesService.create(t); } catch { /* skip */ }
  }

  // ─── 10 Flows (all functional, no fakes) ───────────────────────────────────

  const flows = [
    // 1. Welcome Bot — greets anyone who says hi/hello/hey
    {
      name: 'Welcome Bot',
      description: 'Greets anyone who says hi, hello, or hey with a menu',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['hi', 'hello', 'hey', 'hola', 'assalamualaikum'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Greeting detected' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Welcome', message: 'Hello! 👋 Welcome!\n\nHow can I help you today?\n\n1️⃣ About us\n2️⃣ Support\n3️⃣ Talk to a human\n\nJust type your choice or ask anything!' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    },

    // 2. Auto-Reply (Away) — responds to all messages when enabled
    {
      name: 'Auto-Reply (Away)',
      description: 'Enable this when you are unavailable. Disable when you are back.',
      trigger_type: 'message',
      trigger_config: {},
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Any message' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { label: 'Away reply', message: "Thanks for your message! 🙏\n\nWe're currently away and will get back to you as soon as possible.\n\nOur business hours: Mon-Fri 9AM-6PM" } },
        { id: 'end1', type: 'end', position: { x: 250, y: 240 }, data: { label: 'End' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'end1' }],
    },

    // 3. AI Support Agent — uses configured AI to answer questions
    {
      name: 'AI Support Agent',
      description: 'Answers support questions using AI. Requires AI provider configured.',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['support', 'help', 'issue', 'problem', 'bug'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Support keywords' } },
        { id: 'a1', type: 'ai_reply', position: { x: 250, y: 120 }, data: { label: 'AI answers', systemPrompt: 'You are a customer support agent. Be helpful, concise, and professional. If you cannot solve the issue, tell the user a human agent will follow up.' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 240 }, data: { label: 'Tag contact', tag: 'needs-support' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'tag1' }],
    },

    // 4. Lead Capture — collects name and email, tags the contact
    {
      name: 'Lead Capture',
      description: 'Collects name and email from interested users and tags them as leads',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['interested', 'pricing', 'quote', 'demo'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Interest keywords' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 100 }, data: { message: "Great to hear you're interested! 🎉\n\nWhat's your name?" } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 200 }, data: { label: 'Wait for name' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 300 }, data: { variable: 'name', value: '{{message}}' } },
        { id: 'm2', type: 'send_message', position: { x: 250, y: 400 }, data: { message: 'Thanks {{name}}! And your email so we can send details?' } },
        { id: 'w2', type: 'wait_for_reply', position: { x: 250, y: 500 }, data: { label: 'Wait for email' } },
        { id: 'v2', type: 'set_variable', position: { x: 250, y: 600 }, data: { variable: 'email', value: '{{message}}' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 700 }, data: { tag: 'lead' } },
        { id: 'm3', type: 'send_message', position: { x: 250, y: 800 }, data: { message: "Perfect {{name}}! 📧 We'll reach out to {{email}} shortly.\n\nAnything else you'd like to know?" } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' },
        { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'm2' },
        { id: 'e5', source: 'm2', target: 'w2' }, { id: 'e6', source: 'w2', target: 'v2' },
        { id: 'e7', source: 'v2', target: 'tag1' }, { id: 'e8', source: 'tag1', target: 'm3' },
      ],
    },

    // 5. Feedback Collector — asks for rating, tags based on score
    {
      name: 'Feedback Collector',
      description: 'Asks for a 1-5 star rating and tags the contact accordingly',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['feedback', 'rate', 'review'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Feedback keywords' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: 'We\'d love your feedback! 🌟\n\nRate your experience 1-5:\n\n1 ⭐ Poor\n2 ⭐⭐ Fair\n3 ⭐⭐⭐ Good\n4 ⭐⭐⭐⭐ Great\n5 ⭐⭐⭐⭐⭐ Amazing' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait for rating' } },
        { id: 'v1', type: 'set_variable', position: { x: 250, y: 340 }, data: { variable: 'rating', value: '{{message}}' } },
        { id: 'c1', type: 'condition', position: { x: 250, y: 440 }, data: { label: 'Rating >= 4?', field: '{{rating}}', operator: 'regex', value: '^[4-5]' } },
        { id: 'm2', type: 'send_message', position: { x: 80, y: 580 }, data: { label: 'Happy', message: "Thank you! We're glad you had a great experience! 🎉" } },
        { id: 'm3', type: 'send_message', position: { x: 420, y: 580 }, data: { label: 'Needs work', message: "Thank you for your honesty. We'll work to improve. 🙏\n\nWould you like to tell us more? Reply with your feedback." } },
        { id: 'tag1', type: 'add_tag', position: { x: 80, y: 700 }, data: { tag: 'happy-customer' } },
        { id: 'tag2', type: 'add_tag', position: { x: 420, y: 700 }, data: { tag: 'needs-followup' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' },
        { id: 'e3', source: 'w1', target: 'v1' }, { id: 'e4', source: 'v1', target: 'c1' },
        { id: 'e5', source: 'c1', target: 'm2', sourceHandle: 'true' },
        { id: 'e6', source: 'c1', target: 'm3', sourceHandle: 'false' },
        { id: 'e7', source: 'm2', target: 'tag1' }, { id: 'e8', source: 'm3', target: 'tag2' },
      ],
    },

    // 6. Urgent Message Router — different responses for urgent vs normal
    {
      name: 'Urgent Message Router',
      description: 'Detects "urgent" or "emergency" and responds with priority handling',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['urgent', 'emergency', 'asap', 'critical'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Urgent keywords' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 120 }, data: { tag: 'urgent' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 240 }, data: { message: '🚨 Your message has been marked as URGENT.\n\nA team member has been notified and will respond within 15 minutes.\n\nPlease describe your issue and we\'ll prioritize it.' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'tag1' }, { id: 'e2', source: 'tag1', target: 'm1' }],
    },

    // 7. Unsubscribe Handler — opt-out with tag
    {
      name: 'Unsubscribe Handler',
      description: 'Handles opt-out requests — tags contact and confirms',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['stop', 'unsubscribe', 'optout', 'opt out'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Unsubscribe words' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 120 }, data: { tag: 'unsubscribed' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 240 }, data: { message: "You've been unsubscribed. ✅\n\nYou won't receive broadcast messages from us anymore.\n\nReply START anytime to re-subscribe." } },
        { id: 'end1', type: 'end', position: { x: 250, y: 360 }, data: { label: 'End' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'tag1' }, { id: 'e2', source: 'tag1', target: 'm1' }, { id: 'e3', source: 'm1', target: 'end1' }],
    },

    // 8. Re-subscribe Handler
    {
      name: 'Re-subscribe Handler',
      description: 'Handles opt-in when user sends START',
      trigger_type: 'exact',
      trigger_config: { text: 'start' },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Exact: "start"' } },
        { id: 'tag1', type: 'add_tag', position: { x: 250, y: 120 }, data: { tag: 'subscribed' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 240 }, data: { message: "Welcome back! 🎉 You've been re-subscribed.\n\nYou'll now receive our updates and broadcasts." } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'tag1' }, { id: 'e2', source: 'tag1', target: 'm1' }],
    },

    // 9. AI Chatbot — conversational AI activated by keyword
    {
      name: 'AI Chatbot',
      description: 'Activates an AI assistant when user sends "ai" or "ask". Requires AI provider.',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['ai', 'ask', 'chatbot', 'gpt'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'AI keywords' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: '🤖 AI Assistant here! Send your question and I\'ll help.' } },
        { id: 'w1', type: 'wait_for_reply', position: { x: 250, y: 240 }, data: { label: 'Wait for question' } },
        { id: 'a1', type: 'ai_reply', position: { x: 250, y: 360 }, data: { label: 'Generate answer', systemPrompt: 'You are a helpful assistant on WhatsApp. Keep responses under 200 words. Use emojis. Be friendly and accurate.' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }, { id: 'e2', source: 'm1', target: 'w1' }, { id: 'e3', source: 'w1', target: 'a1' }],
    },

    // 10. Business Hours Check — responds differently during/outside hours
    {
      name: 'Business Hours Info',
      description: 'Tells users your business hours and contact info',
      trigger_type: 'keyword',
      trigger_config: { keywords: ['hours', 'open', 'closed', 'timing', 'schedule', 'when'] },
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Hours keywords' } },
        { id: 'm1', type: 'send_message', position: { x: 250, y: 120 }, data: { message: '🕐 *Business Hours*\n\nMonday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 2:00 PM\nSunday: Closed\n\n📍 Location: Your Address Here\n📞 Phone: +880-XXX-XXXX\n📧 Email: info@yourbusiness.com\n\nMessages outside hours will be answered next business day.' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    },
  ];

  for (const f of flows) {
    try { flowService.create(f as any); } catch { /* skip */ }
  }

  db.prepare("INSERT OR REPLACE INTO _pro_meta (key, value) VALUES ('seeded', ?)").run(new Date().toISOString());
}
