import { useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Node, type Edge,
  BackgroundVariant, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, handleError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { customNodeTypes, NODE_PALETTE } from './node-types';
import { NodeConfigPanel } from './node-config';
import { Save, ArrowLeft, Play, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface FlowData {
  flow: {
    id: string; name: string; description: string; client_id: string;
    trigger_type: string; trigger_config: Record<string, any>;
    nodes: any[]; edges: any[]; enabled: boolean;
  };
}

export default function FlowBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowLoaded, setFlowLoaded] = useState(false);

  // Load flow data
  const { data } = useQuery({
    queryKey: ['flow', id],
    queryFn: () => api.get<FlowData>(`/pro/flows/${id}`),
    enabled: !!id,
  });

  // Initialize nodes/edges from loaded flow (once)
  if (data?.flow && !flowLoaded) {
    setNodes(data.flow.nodes || []);
    setEdges(data.flow.edges || []);
    setFlowLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/pro/flows/${id}`, { nodes, edges }),
    onSuccess: () => { toast.success('Flow saved'); queryClient.invalidateQueries({ queryKey: ['flow', id] }); },
    onError: handleError,
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.put(`/pro/flows/${id}/toggle`),
    onSuccess: () => { toast.success(data?.flow.enabled ? 'Flow disabled' : 'Flow enabled'); queryClient.invalidateQueries({ queryKey: ['flow', id] }); queryClient.invalidateQueries({ queryKey: ['flows'] }); setFlowLoaded(false); },
    onError: handleError,
  });

  const testMutation = useMutation({
    mutationFn: () => api.post(`/pro/flows/${id}/test`, { message: 'Test message from flow builder' }),
    onSuccess: () => toast.success('Test execution complete'),
    onError: handleError,
  });

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#484f58', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#484f58' },
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from config panel
  const handleNodeDataChange = useCallback((nodeId: string, newData: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n));
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Drag & drop from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    const label = e.dataTransfer.getData('label');
    if (!type) return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: e.clientX - bounds.left - 100, y: e.clientY - bounds.top - 25 },
      data: { label: label || type },
    };

    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const flow = data?.flow;

  return (
    <div className="flex h-[calc(100vh-1rem)] -m-6">
      {/* Left sidebar — Node Palette */}
      <div className="w-56 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-[var(--border)]">
          <Button variant="ghost" size="sm" onClick={() => navigate('/flows')} className="mb-2 w-full justify-start">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Flows
          </Button>
          <h2 className="text-sm font-bold text-[var(--text)] truncate">{flow?.name || 'Loading...'}</h2>
          {flow && <Badge variant={flow.enabled ? 'success' : 'neutral'} className="mt-1">{flow.enabled ? 'Active' : 'Draft'}</Badge>}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Drag nodes to canvas</p>
          {['Triggers', 'Actions', 'Logic', 'Data'].map(cat => (
            <div key={cat} className="mb-3">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sec)]">{cat}</p>
              {NODE_PALETTE.filter(n => n.category === cat).map(item => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('application/reactflow', item.type); e.dataTransfer.setData('label', item.label); e.dataTransfer.effectAllowed = 'move'; }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[var(--bg-hover)] transition-colors mb-0.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#484f58]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center — Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-raised)]">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => testMutation.mutate()} isLoading={testMutation.isPending}>
              <Play className="h-3.5 w-3.5" /> Test
            </Button>
          </div>
          <Button size="sm" variant={flow?.enabled ? 'danger' : 'primary'} onClick={() => toggleMutation.mutate()}>
            {flow?.enabled ? <><PowerOff className="h-3.5 w-3.5" /> Disable</> : <><Power className="h-3.5 w-3.5" /> Enable</>}
          </Button>
        </div>

        {/* ReactFlow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={customNodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#484f58', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#484f58' },
            }}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 0.85 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
            minZoom={0.2}
            maxZoom={1.5}
            className="bg-[var(--bg)]"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#21262d" />
            <Controls className="!bg-[var(--bg-raised)] !border-[var(--border)] !rounded-lg [&>button]:!bg-[var(--bg-raised)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--text-sec)] [&>button:hover]:!bg-[var(--bg-hover)]" />
            <MiniMap
              nodeColor="#30363d"
              maskColor="rgba(13, 17, 23, 0.8)"
              className="!bg-[var(--bg-raised)] !border-[var(--border)] !rounded-lg"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right sidebar — Node Config */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode as any}
          onChange={handleNodeDataChange}
          onClose={() => setSelectedNode(null)}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  );
}
