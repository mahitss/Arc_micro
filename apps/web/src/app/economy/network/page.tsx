'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchNetworkGraph,
  NetworkGraph,
  NetworkGraphNode,
  NetworkGraphEdge,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function EconomicNetworkGraphPage() {
  const [graph, setGraph] = useState<NetworkGraph>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<NetworkGraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkGraphEdge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNetworkGraph();
        setGraph(data);
        if (data.nodes.length > 0) setSelectedNode(data.nodes[0]);
      } catch (err) {
        console.error('Failed to load network graph:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase font-mono">
                Autonomous Economic Network Graph
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Autonomous Economic Graph & Topological Clearing
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Live representation of multi-agent contracts, debt edges (OWES, OWED_BY), bilateral commitments, and netting loops.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/netting"
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold font-mono rounded-lg transition-colors"
            >
              Netting Center →
            </Link>
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-semibold font-mono rounded-lg border border-[#222222] transition-colors"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* Main Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#F2F0EA]">Network Topology Visualization</h2>
              <p className="text-xs text-[#716F69]">Click any node or relationship edge to inspect authoritative state.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#716F69] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] inline-block" /> Agent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#716F69] inline-block" /> Org</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2FB36F] inline-block" /> Contract</span>
            </div>
          </div>

          <div className="relative h-96 w-full bg-[#0B0B0B] border border-[#222222] rounded-lg overflow-hidden flex items-center justify-center p-4">
            {loading ? (
              <div className="text-[#716F69] font-mono text-sm">Synthesizing network topology...</div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 600 360">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#D6A83A" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#2FB36F" />
                  </marker>
                </defs>

                {/* Simulated Nodes Positions for standard demo graph */}
                {/* Agent 1 (150, 100) -> Agent 2 (450, 100) -> Agent 3 (300, 280) */}
                <path
                  d="M 170 100 L 430 100"
                  stroke="#D6A83A"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-[#F2F0EA] transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[0] || null)}
                />
                <text x="300" y="85" fill="#D6A83A" textAnchor="middle" fontSize="11" fontFamily="monospace">
                  OWES 10.00 USDC
                </text>

                <path
                  d="M 440 120 L 320 260"
                  stroke="#D6A83A"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-[#F2F0EA] transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[1] || null)}
                />
                <text x="400" y="200" fill="#D6A83A" textAnchor="middle" fontSize="11" fontFamily="monospace">
                  OWES 6.00 USDC
                </text>

                <path
                  d="M 280 260 L 160 120"
                  stroke="#D6A83A"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-[#F2F0EA] transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[2] || null)}
                />
                <text x="200" y="200" fill="#D6A83A" textAnchor="middle" fontSize="11" fontFamily="monospace">
                  OWES 4.00 USDC
                </text>

                {/* Node 1: Agent Auditor 01 */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(graph.nodes[0] || null);
                    setSelectedEdge(null);
                  }}
                >
                  <circle cx="150" cy="100" r="28" fill="#141414" stroke={selectedNode?.id === graph.nodes[0]?.id ? '#D6A83A' : '#222222'} strokeWidth="2" />
                  <text x="150" y="96" fill="#F2F0EA" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="150" y="108" fill="#716F69" textAnchor="middle" fontSize="8" fontFamily="monospace">Auditor 01</text>
                </g>

                {/* Node 2: Agent Researcher 02 */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(graph.nodes[1] || null);
                    setSelectedEdge(null);
                  }}
                >
                  <circle cx="450" cy="100" r="28" fill="#141414" stroke={selectedNode?.id === graph.nodes[1]?.id ? '#D6A83A' : '#222222'} strokeWidth="2" />
                  <text x="450" y="96" fill="#F2F0EA" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="450" y="108" fill="#716F69" textAnchor="middle" fontSize="8" fontFamily="monospace">Research 02</text>
                </g>

                {/* Node 3: Agent Executor 03 */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(graph.nodes[2] || null);
                    setSelectedEdge(null);
                  }}
                >
                  <circle cx="300" cy="275" r="28" fill="#141414" stroke={selectedNode?.id === graph.nodes[2]?.id ? '#D6A83A' : '#222222'} strokeWidth="2" />
                  <text x="300" y="271" fill="#F2F0EA" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="300" y="283" fill="#716F69" textAnchor="middle" fontSize="8" fontFamily="monospace">Executor 03</text>
                </g>
              </svg>
            )}
          </div>

          <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3 text-xs text-[#716F69] flex items-center justify-between">
            <span>Cycle Detected: A owes B (10), B owes C (6), C owes A (4)</span>
            <span className="text-[#2FB36F] font-mono font-semibold">Nettable Loop Potential: 4.00 USDC collapsed</span>
          </div>
        </div>

        {/* Node / Edge Detail Inspector Panel */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="border-b border-[#222222] pb-3">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider">Topological Inspector</h3>
            <p className="text-xs text-[#716F69]">Authoritative entity and edge metadata.</p>
          </div>

          {selectedEdge ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="text-[#716F69] uppercase text-[10px]">Relationship Edge</div>
                <div className="text-[#D6A83A] font-bold text-sm">{selectedEdge.edge_type}</div>
                <div className="text-[#B0ADA5]">From: <span className="text-[#F2F0EA]">{selectedEdge.from}</span></div>
                <div className="text-[#B0ADA5]">To: <span className="text-[#F2F0EA]">{selectedEdge.to}</span></div>
                <div className="text-[#2FB36F] font-bold text-sm">{formatUsdc(selectedEdge.amount)}</div>
                <div className="text-[#716F69]">Status: <span className="text-[#F2F0EA]">{selectedEdge.state}</span></div>
                {selectedEdge.contract_id && (
                  <div className="text-[#716F69]">Contract: <span className="text-[#B0ADA5]">{selectedEdge.contract_id}</span></div>
                )}
                {selectedEdge.obligation_id && (
                  <div className="text-[#716F69]">Obligation: <span className="text-[#B0ADA5]">{selectedEdge.obligation_id}</span></div>
                )}
              </div>
              <Link
                href={`/control/economy/obligations/${selectedEdge.obligation_id || 'ob_live_101'}`}
                className="block text-center w-full py-2 bg-[#141414] hover:bg-[#181818] border border-[#222222] text-[#F2F0EA] rounded font-mono font-semibold text-xs transition-colors"
              >
                Inspect Canonical Financial Trace →
              </Link>
            </div>
          ) : selectedNode ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="text-[#716F69] uppercase text-[10px]">Entity Node</div>
                <div className="text-[#D6A83A] font-bold text-sm">{selectedNode.label}</div>
                <div className="text-[#716F69]">Node ID: <span className="text-[#B0ADA5]">{selectedNode.id}</span></div>
                <div className="text-[#716F69]">Type: <span className="text-[#F2F0EA]">{selectedNode.type}</span></div>
                <div className="text-[#716F69]">Current Exposure: <span className="text-[#2FB36F] font-bold">{formatUsdc(selectedNode.exposure)}</span></div>
                <div className="text-[#716F69]">Active Obligations: <span className="text-[#F2F0EA]">{selectedNode.active_obligations}</span></div>
                <div className="text-[#716F69]">Settled Amount: <span className="text-[#B0ADA5]">{formatUsdc(selectedNode.settled_amount)}</span></div>
                <div className="text-[#716F69]">Pending Amount: <span className="text-[#D6A83A]">{formatUsdc(selectedNode.pending_amount)}</span></div>
              </div>
              <Link
                href={`/control/economy/counterparties/${selectedNode.id}`}
                className="block text-center w-full py-2 bg-[#141414] hover:bg-[#181818] border border-[#222222] text-[#F2F0EA] rounded font-mono font-semibold text-xs transition-colors"
              >
                View Counterparty Profile →
              </Link>
            </div>
          ) : (
            <div className="text-[#716F69] font-mono text-xs py-8 text-center">Select an item on canvas</div>
          )}
        </div>
      </div>
    </div>
  );
}
