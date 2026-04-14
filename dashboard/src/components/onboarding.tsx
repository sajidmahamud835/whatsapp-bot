import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Smartphone, MessageSquare, Workflow, Bot, BarChart3, ArrowRight, X, Rocket } from 'lucide-react';

const STEPS = [
  {
    icon: Rocket,
    title: 'Welcome to WA Convo!',
    description: 'The most complete WhatsApp automation platform. Let\'s get you set up in 60 seconds.',
    tip: 'This quick tour will show you the key features. You can skip anytime.',
  },
  {
    icon: Smartphone,
    title: '1. Connect WhatsApp',
    description: 'Go to Clients page, click Initialize on Client 1, then scan the QR code with your phone.',
    tip: 'Settings > Linked Devices > Link a Device',
    link: '/clients',
  },
  {
    icon: MessageSquare,
    title: '2. Send Messages',
    description: 'Use the Messages page for a WhatsApp-like chat interface. Send text messages to any number.',
    tip: 'Messages are stored in SQLite and survive restarts.',
    link: '/messages',
  },
  {
    icon: Workflow,
    title: '3. Build Chatbot Flows',
    description: '15 pre-built flows are ready to use! Enable them or create your own with the visual drag-and-drop builder.',
    tip: 'Drag nodes from the palette, connect them, and enable the flow.',
    link: '/flows',
  },
  {
    icon: Bot,
    title: '4. Enable AI Auto-Reply',
    description: 'Connect OpenAI, Claude, Gemini, or Ollama. Your bot will automatically reply to messages.',
    tip: 'Go to AI Config, add a provider, and toggle Enable.',
    link: '/ai-config',
  },
  {
    icon: BarChart3,
    title: '5. Track Everything',
    description: 'Analytics shows message volume, top contacts, and AI performance. Export data as CSV anytime.',
    tip: 'Contacts, templates, campaigns, and cron jobs are all ready to use.',
    link: '/analytics',
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem('wa-convo-onboarding-done');
    if (!dismissed) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem('wa-convo-onboarding-done', 'true');
    setShow(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  }

  function goTo(link?: string) {
    dismiss();
    if (link) navigate(link);
  }

  const current = STEPS[step]!;
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Modal open={show} onClose={dismiss} size="md">
      <div className="text-center py-2">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[var(--brand)]' : 'w-1.5 bg-[var(--border)]'}`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand)]/10 mb-4">
          <Icon className="h-8 w-8 text-[var(--brand)]" style={{ color: 'var(--brand)' }} />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">{current.title}</h2>
        <p className="text-sm text-[var(--text-sec)] mb-3 max-w-sm mx-auto">{current.description}</p>

        {current.tip && (
          <div className="rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
            💡 {current.tip}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            <X className="h-3.5 w-3.5" /> Skip Tour
          </Button>
          {current.link && (
            <Button variant="secondary" size="sm" onClick={() => goTo(current.link)}>
              Go There <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {isLast ? "Let's Go!" : 'Next'} {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
