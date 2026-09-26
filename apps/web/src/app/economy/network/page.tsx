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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-[#a3a3a3] uppercase font-mono">
                Autonomous Economic Network Graph
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Autonomous Economic Graph & Topological Clearing
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live representation of multi-agent contracts, debt edges (OWES, OWED_BY), bilateral commitments, and netting loops.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/netting"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-cyan-600/20"
            >
              Netting Center →
            </Link>
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* Main Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Network Topology Visualization</h2>
              <p className="text-xs text-slate-400">Click any node or relationship edge to inspect authoritative state.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Agent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Org</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Contract</span>
            </div>
          </div>

          <div className="relative h-96 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center p-4">
            {loading ? (
              <div className="text-slate-500 font-mono text-sm">Synthesizing network topology...</div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 600 360">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
                  </marker>
                </defs>

                {/* Simulated Nodes Positions for standard demo graph */}
                {/* Agent 1 (150, 100) -> Agent 2 (450, 100) -> Agent 3 (300, 280) */}
                <path
                  d="M 170 100 L 430 100"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-cyan-300 transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[0] || null)}
                />
                <text x="300" y="85" fill="#38bdf8" textAnchor="middle" fontSize="11" fontFamily="monospace">
                  OWES 10.00 USDC
                </text>

                <path
                  d="M 440 120 L 320 260"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-cyan-300 transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[1] || null)}
                />
                <text x="400" y="200" fill="#38bdf8" textAnchor="middle" fontSize="11" fontFamily="monospace">
                  OWES 6.00 USDC
                </text>

                <path
                  d="M 280 260 L 160 120"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="cursor-pointer hover:stroke-cyan-300 transition-colors"
                  onClick={() => setSelectedEdge(graph.edges[2] || null)}
                />
                <text x="200" y="200" fill="#38bdf8" textAnchor="middle" fontSize="11" fontFamily="monospace">
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
                  <circle cx="150" cy="100" r="28" fill="#1e1b4b" stroke={selectedNode?.id === graph.nodes[0]?.id ? '#818cf8' : '#4338ca'} strokeWidth="3" />
                  <text x="150" y="96" fill="#e0e7ff" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="150" y="108" fill="#a5b4fc" textAnchor="middle" fontSize="8" fontFamily="monospace">Auditor 01</text>
                </g>

                {/* Node 2: Agent Researcher 02 */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(graph.nodes[1] || null);
                    setSelectedEdge(null);
                  }}
                >
                  <circle cx="450" cy="100" r="28" fill="#1e1b4b" stroke={selectedNode?.id === graph.nodes[1]?.id ? '#818cf8' : '#4338ca'} strokeWidth="3" />
                  <text x="450" y="96" fill="#e0e7ff" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="450" y="108" fill="#a5b4fc" textAnchor="middle" fontSize="8" fontFamily="monospace">Research 02</text>
                </g>

                {/* Node 3: Agent Executor 03 */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(graph.nodes[2] || null);
                    setSelectedEdge(null);
                  }}
                >
                  <circle cx="300" cy="275" r="28" fill="#1e1b4b" stroke={selectedNode?.id === graph.nodes[2]?.id ? '#818cf8' : '#4338ca'} strokeWidth="3" />
                  <text x="300" y="271" fill="#e0e7ff" textAnchor="middle" fontSize="10" fontWeight="bold">Agent</text>
                  <text x="300" y="283" fill="#a5b4fc" textAnchor="middle" fontSize="8" fontFamily="monospace">Executor 03</text>
                </g>
              </svg>
            )}
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center justify-between">
            <span>Cycle Detected: A owes B (10), B owes C (6), C owes A (4)</span>
            <span className="text-emerald-400 font-mono font-semibold">Nettable Loop Potential: 4.00 USDC collapsed</span>
          </div>
        </div>

        {/* Node / Edge Detail Inspector Panel */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Topological Inspector</h3>
            <p className="text-xs text-slate-400">Authoritative entity and edge metadata.</p>
          </div>

          {selectedEdge ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="text-slate-400 uppercase text-[10px]">Relationship Edge</div>
                <div className="text-cyan-400 font-bold text-sm">{selectedEdge.edge_type}</div>
                <div className="text-slate-300">From: <span className="text-indigo-300">{selectedEdge.from}</span></div>
                <div className="text-slate-300">To: <span className="text-indigo-300">{selectedEdge.to}</span></div>
                <div className="text-emerald-400 font-bold text-sm">{formatUsdc(selectedEdge.amount)}</div>
                <div className="text-slate-400">Status: <span className="text-white">{selectedEdge.state}</span></div>
                {selectedEdge.contract_id && (
                  <div className="text-slate-400">Contract: <span className="text-slate-200">{selectedEdge.contract_id}</span></div>
                )}
                {selectedEdge.obligation_id && (
                  <div className="text-slate-400">Obligation: <span className="text-slate-200">{selectedEdge.obligation_id}</span></div>
                )}
              </div>
              <Link
                href={`/control/economy/obligations/${selectedEdge.obligation_id || 'ob_live_101'}`}
                className="block text-center w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-medium text-xs transition-colors"
              >
                Inspect Canonical Financial Trace →
              </Link>
            </div>
          ) : selectedNode ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="text-slate-400 uppercase text-[10px]">Entity Node</div>
                <div className="text-indigo-400 font-bold text-sm">{selectedNode.label}</div>
                <div className="text-slate-400">Node ID: <span className="text-slate-200">{selectedNode.id}</span></div>
                <div className="text-slate-400">Type: <span className="text-purple-400">{selectedNode.type}</span></div>
                <div className="text-slate-400">Current Exposure: <span className="text-emerald-400 font-bold">{formatUsdc(selectedNode.exposure)}</span></div>
                <div className="text-slate-400">Active Obligations: <span className="text-white">{selectedNode.active_obligations}</span></div>
                <div className="text-slate-400">Settled Amount: <span className="text-slate-300">{formatUsdc(selectedNode.settled_amount)}</span></div>
                <div className="text-slate-400">Pending Amount: <span className="text-amber-400">{formatUsdc(selectedNode.pending_amount)}</span></div>
              </div>
              <Link
                href={`/control/economy/counterparties/${selectedNode.id}`}
                className="block text-center w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-medium text-xs transition-colors"
              >
                View Counterparty Profile →
              </Link>
            </div>
          ) : (
            <div className="text-slate-500 font-mono text-xs py-8 text-center">Select an item on canvas</div>
          )}
        </div>
      </div>
    </div>
  );
}
