import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNetworkData } from '../context/NetworkDataContext';
import { useAuth } from '../context/AuthContext';
import {
  GitFork,
  Cloud,
  Shield,
  Server,
  Layers,
  Wifi,
  Users,
  Plus,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Move,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TopologyNode, TopologyLink } from '../types';

export const TopologyPage: React.FC = () => {
  const { t } = useLanguage();
  const {
    topologyNodes,
    topologyLinks,
    updateTopologyNodePosition,
    addTopologyNode,
    deleteTopologyNode,
    toggleSubtreeCollapse,
    connectTopologyLink,
    saveTopologyLayout,
  } = useNetworkData();
  const { isAdmin, isEngineer, isViewer } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Link Connect Form State
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [linkType, setLinkType] = useState<'fiber_10g' | 'copper_1g' | 'fiber_40g' | 'trunk'>('fiber_10g');

  // Add Node Form State
  const [newNode, setNewNode] = useState({
    label: '',
    ip: '',
    tier: 4 as 1 | 2 | 3 | 4 | 5,
    type: 'dist_switch' as TopologyNode['type'],
    status: 'online' as 'online' | 'warning' | 'offline',
    x: 500,
    y: 500,
    model: 'Catalyst 9200',
  });

  const canEdit = !isViewer && (isAdmin || isEngineer);

  // Window-level mouse listeners while dragging to prevent cursor sticking / leaks
  useEffect(() => {
    if (!draggedNodeId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoomLevel;
      const mouseY = (e.clientY - rect.top) / zoomLevel;

      const newX = Math.max(40, Math.min(1200, Math.round(mouseX - dragOffset.x)));
      const newY = Math.max(30, Math.min(1000, Math.round(mouseY - dragOffset.y)));
      updateTopologyNodePosition(draggedNodeId, newX, newY);
    };

    const handleWindowMouseUp = () => {
      setDraggedNodeId(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggedNodeId, dragOffset, zoomLevel, updateTopologyNodePosition]);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent, node: TopologyNode) => {
    if (!canEdit || !editMode) {
      setSelectedNode(node);
      return;
    }
    e.stopPropagation();
    setDraggedNodeId(node.id);
    setSelectedNode(node);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoomLevel;
      const mouseY = (e.clientY - rect.top) / zoomLevel;
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y,
      });
    }
  };

  const handleSave = () => {
    saveTopologyLayout();
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleConnectLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      alert('Please select two distinct nodes to connect.');
      return;
    }
    connectTopologyLink(sourceNodeId, targetNodeId, linkType);
    setShowConnectModal(false);
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    addTopologyNode(newNode);
    setShowAddModal(false);
    setNewNode({
      label: '',
      ip: '',
      tier: 4,
      type: 'dist_switch',
      status: 'online',
      x: 500,
      y: 500,
      model: 'Catalyst 9200',
    });
  };

  const getNodeIcon = (type: TopologyNode['type']) => {
    switch (type) {
      case 'wan':
        return <Cloud className="w-5 h-5 text-blue-400" />;
      case 'firewall':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'core_switch':
        return <Server className="w-5 h-5 text-cyan-400" />;
      case 'dist_switch':
        return <Layers className="w-5 h-5 text-purple-400" />;
      case 'edge_ap':
        return <Wifi className="w-5 h-5 text-amber-400" />;
      case 'host_group':
        return <Users className="w-5 h-5 text-slate-300" />;
      case 'server':
        return <Server className="w-5 h-5 text-rose-400" />;
      default:
        return <Server className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getNodeBorder = (node: TopologyNode) => {
    const isSearched =
      searchQuery &&
      (node.label.toLowerCase().includes(searchQuery.toLowerCase()) || node.ip.includes(searchQuery));
    if (isSearched) return 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-500/50';
    if (selectedNode?.id === node.id) return 'ring-2 ring-cyan-500 shadow-md';
    if (node.status === 'warning') return 'border-amber-500';
    if (node.status === 'offline') return 'border-rose-500';
    return 'border-slate-700 hover:border-cyan-500';
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <GitFork className="w-6 h-6 text-cyan-500" />
            {t('interactiveTopology')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hierarchical 5-Tier layout with collapsible client subtrees (Architecture scalable to 200–300 nodes)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Node Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('searchNode')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-44"
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
              title={t('zoomIn')}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-500">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
              title={t('zoomOut')}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title={t('resetView')}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-white border-l border-slate-200 dark:border-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit Mode Toggle (Admin & Engineer Only) */}
          {canEdit && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  editMode
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>{editMode ? t('exitEditMode') : t('editMode')}</span>
              </button>

              {editMode && (
                <>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addNode')}</span>
                  </button>

                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{t('connectCable')}</span>
                  </button>

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('saveLayout')}</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Layout Success Banner */}
      {saveSuccessNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{t('layoutSaved')}</span>
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative min-h-[720px] select-none">
        {/* Tier Backdrop Grid Lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-6 px-4 opacity-25">
          <div className="border-b border-dashed border-slate-700 pb-1 text-[10px] font-mono text-slate-500">
            TIER 1: WAN / BGP EXTERNAL TRANSIT
          </div>
          <div className="border-b border-dashed border-slate-700 pb-1 text-[10px] font-mono text-slate-500">
            TIER 2: PERIMETER NGFW & SECURITY CLUSTER
          </div>
          <div className="border-b border-dashed border-slate-700 pb-1 text-[10px] font-mono text-slate-500">
            TIER 3: CORE L3 100G SWITCHING BACKBONE
          </div>
          <div className="border-b border-dashed border-slate-700 pb-1 text-[10px] font-mono text-slate-500">
            TIER 4: DISTRIBUTION & SERVER AGGREGATION LAYER
          </div>
          <div className="pb-1 text-[10px] font-mono text-slate-500">
            TIER 5: EDGE ACCESS APs & COLLAPSIBLE HOST SUBTREES (200+ NODES)
          </div>
        </div>

        {/* Scaled Interactive Canvas Area */}
        <div
          ref={canvasRef}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            width: '1350px',
            height: '920px',
          }}
          className="relative"
        >
          {/* Render SVG Topology Links */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {topologyLinks.map(link => {
              const sourceNode = topologyNodes.find(n => n.id === link.source);
              const targetNode = topologyNodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;

              const isDegraded = link.status === 'degraded';
              const strokeColor = isDegraded
                ? '#f59e0b'
                : link.linkType.includes('fiber')
                ? '#06b6d4'
                : '#3b82f6';

              return (
                <g key={link.id}>
                  <line
                    x1={sourceNode.x + 80}
                    y1={sourceNode.y + 35}
                    x2={targetNode.x + 80}
                    y2={targetNode.y + 35}
                    stroke={strokeColor}
                    strokeWidth={link.linkType === 'fiber_40g' ? 3 : 2}
                    strokeDasharray={isDegraded ? '5,5' : 'none'}
                    opacity={0.7}
                  />
                  {/* Speed Badge along link midpoint */}
                  <text
                    x={(sourceNode.x + targetNode.x) / 2 + 80}
                    y={(sourceNode.y + targetNode.y) / 2 + 30}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="bg-slate-900"
                  >
                    {link.speed}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Render Topology Nodes */}
          {topologyNodes.map(node => {
            const isGroup = node.type === 'host_group';
            return (
              <div
                key={node.id}
                onMouseDown={e => handleMouseDown(e, node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  cursor: editMode && canEdit ? 'grab' : 'pointer',
                }}
                className={`absolute w-44 rounded-xl bg-slate-900/95 border p-2.5 transition-shadow z-10 ${getNodeBorder(
                  node
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-slate-800">{getNodeIcon(node.type)}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate max-w-[100px]" title={node.label}>
                        {node.label}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono">{node.ip}</div>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full mt-1 ${
                      node.status === 'online'
                        ? 'bg-emerald-500 shadow-xs shadow-emerald-500'
                        : node.status === 'warning'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </div>

                {/* Collapsible Subtree for Scalability (200-300 devices handling) */}
                {isGroup && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px]">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleSubtreeCollapse(node.id);
                      }}
                      className="w-full flex items-center justify-between text-slate-300 hover:text-white font-mono"
                    >
                      <span className="font-bold text-cyan-400">+{node.groupCount} Nodes</span>
                      {node.isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {!node.isCollapsed && node.subClients && (
                      <div className="mt-1.5 space-y-1 text-[9px] text-slate-400 bg-slate-950 p-1.5 rounded">
                        {node.subClients.map((sub, i) => (
                          <div key={i} className="truncate">
                            • {sub}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Node in Edit Mode */}
                {editMode && canEdit && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Remove node ${node.label}?`)) {
                        deleteTopologyNode(node.id);
                      }
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md hover:bg-rose-500"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{selectedNode.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Tier {selectedNode.tier}
                </span>
              </div>
              <div className="text-slate-500 font-mono mt-0.5">
                IP: {selectedNode.ip} · Status: <span className="text-emerald-500 font-semibold">{selectedNode.status.toUpperCase()}</span>
                {selectedNode.model && ` · Model: ${selectedNode.model}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
            >
              Close Info
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Node */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-500" />
                {t('addNode')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Node Label</label>
                <input
                  type="text"
                  required
                  value={newNode.label}
                  onChange={e => setNewNode({ ...newNode, label: e.target.value })}
                  placeholder="e.g. Edge-SW-Library"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">{t('ipAddress')}</label>
                  <input
                    type="text"
                    required
                    value={newNode.ip}
                    onChange={e => setNewNode({ ...newNode, ip: e.target.value })}
                    placeholder="10.10.10.90"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Tier Level</label>
                  <select
                    value={newNode.tier}
                    onChange={e => setNewNode({ ...newNode, tier: (parseInt(e.target.value) || 4) as 1 | 2 | 3 | 4 | 5 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={1}>Tier 1 (WAN)</option>
                    <option value={2}>Tier 2 (Firewall)</option>
                    <option value={3}>Tier 3 (Core)</option>
                    <option value={4}>Tier 4 (Distribution)</option>
                    <option value={5}>Tier 5 (Edge Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Connect Cable */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-500" />
                {t('connectCable')}
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectLink} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Source Node</label>
                <select
                  value={sourceNodeId}
                  onChange={e => setSourceNodeId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Select Origin Node...</option>
                  {topologyNodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.ip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Destination Node</label>
                <select
                  value={targetNodeId}
                  onChange={e => setTargetNodeId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Select Target Node...</option>
                  {topologyNodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.ip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">{t('cableType')}</label>
                <select
                  value={linkType}
                  onChange={e => setLinkType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                >
                  <option value="fiber_40g">40 Gbps QSFP+ Fiber Backbone</option>
                  <option value="fiber_10g">10 Gbps SFP+ Fiber Optic</option>
                  <option value="copper_1g">1 Gbps Cat6 Copper Twisted Pair</option>
                  <option value="trunk">802.1Q Inter-Switch Trunk</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Connect Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
