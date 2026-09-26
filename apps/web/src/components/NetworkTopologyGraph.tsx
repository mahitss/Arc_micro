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
    <div className="relative bg-[#101010] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2FB36F]" />
          <h3 className="text-sm font-semibold text-[#F2F0EA] tracking-wide">
            Autonomous Economic Topology Graph
          </h3>
          <span className="text-[11px] font-mono text-[#716F69] bg-[#141414] px-2 py-0.5 rounded-full border border-[#222222]">
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
                  ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D] font-semibold'
                  : 'text-[#A5A29A] hover:text-[#F2F0EA] hover:bg-[#141414]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[480px] bg-[#0B0B0B] flex items-center justify-center">
        <svg
          viewBox="0 0 720 480"
          className="w-full h-full select-none"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="16"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#8F7028" />
            </marker>
          </defs>

          {/* Render Directed Edges */}
          {edges.map((e, idx) => {
            const src = nodeMap.get(e.source);
            const tgt = nodeMap.get(e.target);
            if (!src || !tgt) return null;

            const isDelegation = e.type === 'DELEGATED_TO';
            const strokeColor = isDelegation ? '#D6A83A' : '#2D2D2D';
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
                  strokeWidth={isDelegation ? '1.5' : '1'}
                  strokeDasharray={isDelegation ? '4 3' : undefined}
                  strokeOpacity="0.8"
                  className="transition-all group-hover:stroke-[#D6A83A] group-hover:stroke-width-2"
                  markerEnd="url(#arrowhead)"
                />
                {e.label && (
                  <text
                    x={midX}
                    y={midY - 4}
                    fill="#716F69"
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
                ? '#D6A83A'
                : '#2FB36F'
              : '#6B8FD6';

            return (
              <g
                key={`node-${n.id}`}
                onClick={() => handleNodeClick(n)}
                className="cursor-pointer group"
              >
                {/* Outer Ring when selected */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="24"
                    fill="none"
                    stroke="#D6A83A"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node Body */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="16"
                  fill="#101010"
                  stroke={fillColor}
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-125"
                />

                {/* Inner Icon / Dot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="4"
                  fill={fillColor}
                />

                {/* Node Label */}
                <text
                  x={pos.x}
                  y={pos.y + 26}
                  fill="#F2F0EA"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  className="transition-colors group-hover:fill-[#D6A83A]"
                >
                  {n.label.length > 20 ? n.label.slice(0, 18) + '...' : n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Flyout Info Card */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 bg-[#141414] border border-[#222222] rounded-xl p-4 w-72 shadow-2xl text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-[#D6A83A] font-bold uppercase tracking-wider">
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-[#716F69] hover:text-[#F2F0EA]"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-[#F2F0EA] text-sm mb-1">{selectedNode.label}</div>
            <div className="font-mono text-[11px] text-[#716F69] mb-2 truncate">ID: {selectedNode.id}</div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#B0ADA5]">Status:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                selectedNode.status === 'BUSY'
                  ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                  : 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30'
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
