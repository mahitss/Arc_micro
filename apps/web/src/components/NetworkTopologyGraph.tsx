'use client';

import React, { useState } from 'react';
import type { NetworkGraph, NetworkGraphNode, NetworkGraphEdge } from '@/lib/api/network';

interface NetworkTopologyGraphProps {
  graph: NetworkGraph;
  onSelectNode?: (node: NetworkGraphNode) => void;
}

export function NetworkTopologyGraph({ graph, onSelectNode }: NetworkTopologyGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  // Filter nodes based on selected filter
  const filteredNodes = nodes.filter((n) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'AGENTS') return n.type === 'AGENT';
    if (filterType === 'CAPABILITIES') return n.type === 'CAPABILITY';
    return true;
  });

  const nodeMap = new Map<string, { x: number; y: number; node: NetworkGraphNode }>();

  // Circular layout coordinates for visual clarity
  const centerX = 360;
  const centerY = 240;
  const radius = 170;

  filteredNodes.forEach((n, idx) => {
    const angle = (idx / Math.max(1, filteredNodes.length)) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nodeMap.set(n.id, { x, y, node: n });
  });

  const handleNodeClick = (node: NetworkGraphNode) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) {
      onSelectNode(node);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="relative bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Autonomous Economic Topology Graph
          </h3>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
            {filteredNodes.length} Nodes · {edges.length} Edges
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {['ALL', 'AGENTS', 'CAPABILITIES'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === t
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[480px] bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-slate-950/80 flex items-center justify-center">
        <svg
          viewBox="0 0 720 480"
          className="w-full h-full select-none"
        >
          <defs>
            <linearGradient id="edgeGradHired" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGradDel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="16"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
            </marker>
          </defs>

          {/* Render Directed Edges */}
          {edges.map((e, idx) => {
            const src = nodeMap.get(e.source);
            const tgt = nodeMap.get(e.target);
            if (!src || !tgt) return null;

            const isDelegation = e.type === 'DELEGATED_TO';
            const strokeColor = isDelegation ? '#f59e0b' : '#06b6d4';
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={`edge-${idx}`} className="group cursor-pointer">
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={strokeColor}
                  strokeWidth={isDelegation ? '2' : '1.5'}
                  strokeDasharray={isDelegation ? '4 3' : undefined}
                  strokeOpacity="0.6"
                  className="transition-all group-hover:stroke-opacity-100 group-hover:stroke-width-2"
                  markerEnd="url(#arrowhead)"
                />
                {e.label && (
                  <text
                    x={midX}
                    y={midY - 4}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {filteredNodes.map((n) => {
            const pos = nodeMap.get(n.id);
            if (!pos) return null;

            const isAgent = n.type === 'AGENT';
            const isSelected = selectedNodeId === n.id;
            const isBusy = n.status === 'BUSY';

            const fillColor = isAgent
              ? isBusy
                ? '#f59e0b'
                : '#10b981'
              : '#8b5cf6';

            return (
              <g
                key={`node-${n.id}`}
                onClick={() => handleNodeClick(n)}
                className="cursor-pointer group"
              >
                {/* Outer Glow Ring when selected */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-spin-slow"
                  />
                )}

                {/* Node Body */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="16"
                  fill="#0f172a"
                  stroke={fillColor}
                  strokeWidth="2.5"
                  className="transition-transform group-hover:scale-125"
                />

                {/* Inner Icon / Dot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5"
                  fill={fillColor}
                />

                {/* Node Label */}
                <text
                  x={pos.x}
                  y={pos.y + 26}
                  fill="#f8fafc"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  className="transition-colors group-hover:fill-emerald-400"
                >
                  {n.label.length > 20 ? n.label.slice(0, 18) + '...' : n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Flyout Info Card */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-700/80 rounded-xl p-4 w-72 shadow-2xl backdrop-blur-md animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-white text-sm mb-1">{selectedNode.label}</div>
            <div className="font-mono text-[11px] text-slate-400 mb-2 truncate">ID: {selectedNode.id}</div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Status:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                selectedNode.status === 'BUSY'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {selectedNode.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
