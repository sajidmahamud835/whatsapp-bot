import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  MessageSquare, Image, Bot, GitBranch, Clock, Variable, Tag,
  Globe, Pause, FileText, Play, StopCircle,
} from 'lucide-react';

// ─── Node color scheme ───────────────────────────────────────────────────────

const nodeColors: Record<string, { bg: string; border: string; icon: string }> = {
  trigger:       { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: 'text-emerald-400' },
  send_message:  { bg: 'bg-blue-500/10', border: 'border-blue-500/40', icon: 'text-blue-400' },
  send_media:    { bg: 'bg-purple-500/10', border: 'border-purple-500/40', icon: 'text-purple-400' },
  send_template: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', icon: 'text-cyan-400' },
  ai_reply:      { bg: 'bg-amber-500/10', border: 'border-amber-500/40', icon: 'text-amber-400' },
  condition:     { bg: 'bg-orange-500/10', border: 'border-orange-500/40', icon: 'text-orange-400' },
  delay:         { bg: 'bg-pink-500/10', border: 'border-pink-500/40', icon: 'text-pink-400' },
  set_variable:  { bg: 'bg-teal-500/10', border: 'border-teal-500/40', icon: 'text-teal-400' },
  add_tag:       { bg: 'bg-lime-500/10', border: 'border-lime-500/40', icon: 'text-lime-400' },
  http_request:  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', icon: 'text-indigo-400' },
  wait_for_reply:{ bg: 'bg-rose-500/10', border: 'border-rose-500/40', icon: 'text-rose-400' },
  end:           { bg: 'bg-red-500/10', border: 'border-red-500/40', icon: 'text-red-400' },
};

const nodeIcons: Record<string, any> = {
  trigger: Play, send_message: MessageSquare, send_media: Image,
  send_template: FileText, ai_reply: Bot, condition: GitBranch,
  delay: Clock, set_variable: Variable, add_tag: Tag,
  http_request: Globe, wait_for_reply: Pause, end: StopCircle,
};

// ─── Base Node Component ─────────────────────────────────────────────────────

function FlowNode({ data, type, selected }: NodeProps & { type: string }) {
  const colors = nodeColors[type] || nodeColors.trigger;
  const Icon = nodeIcons[type] || Play;
  const isCondition = type === 'condition';
  const isTrigger = type === 'trigger';
  const isEnd = type === 'end';

  return (
    <div className={`
      rounded-xl border-2 ${colors.bg} ${colors.border} min-w-[200px] max-w-[260px]
      shadow-lg backdrop-blur-sm transition-all
      ${selected ? 'ring-2 ring-emerald-400/60 scale-105' : 'hover:scale-[1.02]'}
    `}>
      {/* Input handle */}
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-[#8b949e] !border-2 !border-[#161b22]" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/5">
        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--text)] truncate">{data.label || type}</p>
          {data.subtitle && <p className="text-[10px] text-[var(--text-muted)] truncate">{data.subtitle}</p>}
        </div>
      </div>

      {/* Preview content */}
      {data.message && (
        <div className="px-3.5 py-2 text-[11px] text-[var(--text-sec)] leading-relaxed line-clamp-2">
          {data.message}
        </div>
      )}
      {data.description && !data.message && (
        <div className="px-3.5 py-2 text-[11px] text-[var(--text-sec)]">
          {data.description}
        </div>
      )}

      {/* Output handles */}
      {isCondition ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-[#161b22] !left-[30%]" />
          <Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !bg-red-400 !border-2 !border-[#161b22] !left-[70%]" />
          <div className="flex justify-between px-4 pb-1.5 text-[9px] font-semibold">
            <span className="text-emerald-400">YES</span>
            <span className="text-red-400">NO</span>
          </div>
        </>
      ) : !isEnd ? (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-[#8b949e] !border-2 !border-[#161b22]" />
      ) : null}
    </div>
  );
}

// ─── Export all node types ───────────────────────────────────────────────────

export const customNodeTypes: Record<string, React.ComponentType<any>> = {
  trigger:        (props: NodeProps) => <FlowNode {...props} type="trigger" />,
  send_message:   (props: NodeProps) => <FlowNode {...props} type="send_message" />,
  send_media:     (props: NodeProps) => <FlowNode {...props} type="send_media" />,
  send_template:  (props: NodeProps) => <FlowNode {...props} type="send_template" />,
  ai_reply:       (props: NodeProps) => <FlowNode {...props} type="ai_reply" />,
  condition:      (props: NodeProps) => <FlowNode {...props} type="condition" />,
  delay:          (props: NodeProps) => <FlowNode {...props} type="delay" />,
  set_variable:   (props: NodeProps) => <FlowNode {...props} type="set_variable" />,
  add_tag:        (props: NodeProps) => <FlowNode {...props} type="add_tag" />,
  http_request:   (props: NodeProps) => <FlowNode {...props} type="http_request" />,
  wait_for_reply: (props: NodeProps) => <FlowNode {...props} type="wait_for_reply" />,
  end:            (props: NodeProps) => <FlowNode {...props} type="end" />,
};

// ─── Node palette for sidebar ────────────────────────────────────────────────

export const NODE_PALETTE = [
  { type: 'trigger', label: 'Trigger', description: 'Start when message arrives', category: 'Triggers' },
  { type: 'send_message', label: 'Send Message', description: 'Send a text message', category: 'Actions' },
  { type: 'send_media', label: 'Send Media', description: 'Send image, video, or file', category: 'Actions' },
  { type: 'send_template', label: 'Send Template', description: 'Use a saved template', category: 'Actions' },
  { type: 'ai_reply', label: 'AI Reply', description: 'Generate AI response', category: 'Actions' },
  { type: 'condition', label: 'Condition', description: 'Branch based on logic', category: 'Logic' },
  { type: 'delay', label: 'Delay', description: 'Wait before continuing', category: 'Logic' },
  { type: 'wait_for_reply', label: 'Wait for Reply', description: 'Pause until user responds', category: 'Logic' },
  { type: 'set_variable', label: 'Set Variable', description: 'Store a value', category: 'Data' },
  { type: 'add_tag', label: 'Add Tag', description: 'Tag the contact', category: 'Data' },
  { type: 'http_request', label: 'HTTP Request', description: 'Call external API', category: 'Data' },
  { type: 'end', label: 'End', description: 'Stop the flow', category: 'Logic' },
];
