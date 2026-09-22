'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getEconomicGraph } from '@/lib/api/a2a';
import { listMissions } from '@/lib/api/missions';
import type { EconomicGraph, GraphNode, GraphEdge, Mission } from '@/lib/api/types';

export default function EconomicNetworkPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('demo-mission-01');
  const [graph, setGraph] = useState<EconomicGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadMissions() {
      try {
        const m = await listMissions({ useDemo: true });
        if (m && m.length > 0) {
          setMissions(m);
          setSelectedMissionId(m[0].id);
        }
      } catch (err) {
        console.error('Failed to load missions for network view:', err);
      }
    }
    loadMissions();
  }, []);

  useEffect(() => {
    async function loadGraph() {
      if (!selectedMissionId) return;
      setLoading(true);
      try {
        const data = await getEconomicGraph(selectedMissionId);
        setGraph(data);
        if (data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      } catch (err) {
        // Fallback demo graph if backend is not seeded with this specific mission
        setGraph({
          mission_id: selectedMissionId,
          nodes: [
            {
              id: selectedMissionId,
              type: 'MISSION',
              label: 'Global Market Intel Mission',
              metadata: {
                budget: '50.00 USDC',
                spent: '12.40 USDC',
                status: 'EXECUTING',
                recursion_depth: '2/3',
              },
            },
            {
              id: 'agent_coordinator_01',
              type: 'AGENT',
              label: 'Primary Coordinator Agent',
              metadata: {
                role: 'Buyer / Orchestrator',
                capabilities: ['planning', 'delegation', 'evaluation'],
                status: 'ACTIVE',
              },
            },
            {
              id: 'agent_research_01',
              type: 'AGENT',
              label: 'Web Intelligence Agent',
              metadata: {
                reputation: '99.2%',
                pricing_model: 'FIXED',
                base_price: '0.30 USDC',
                risk: 'LOW',
              },
            },
            {
              id: 'agent_data_01',
              type: 'AGENT',
              label: 'Data Extraction Agent',
              metadata: {
                reputation: '98.5%',
                pricing_model: 'QUOTE_REQUIRED',
                base_price: '0.50 USDC',
                risk: 'LOW',
              },
            },
            {
              id: 'agent_validator_01',
              type: 'AGENT',
              label: 'Fact Verification Agent',
              metadata: {
                reputation: '99.8%',
                pricing_model: 'FIXED',
                base_price: '0.20 USDC',
                risk: 'LOW',
              },
            },
            {
              id: 'hire_research_101',
              type: 'HIRE',
              label: 'Hire: Raw Market Ingestion',
              metadata: {
                price: '0.30 USDC',
                status: 'COMPLETED',
                call_depth: 1,
                checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                latency: '142 ms',
              },
            },
            {
              id: 'hire_data_102',
              type: 'HIRE',
              label: 'Hire: Nested Entity Parsing',
              metadata: {
                price: '0.48 USDC',
                status: 'COMPLETED',
                call_depth: 2,
                checksum: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
                latency: '280 ms',
              },
            },
            {
              id: 'hire_val_103',
              type: 'HIRE',
              label: 'Hire: Byzantine Claim Validation',
              metadata: {
                price: '0.20 USDC',
                status: 'EXECUTING',
                call_depth: 2,
                latency: 'In Progress',
              },
            },
            {
              id: 'pi_res_001',
              type: 'PAYMENT',
              label: 'Settlement: 0.30 USDC',
              metadata: {
                decision: 'ALLOW',
                status: 'CONFIRMED',
                mode: 'Live Arc Settlement',
                tx_hash: '0x3a4f89d98bc944321287e0fa8892dc4901baef48',
              },
            },
            {
              id: 'pi_data_002',
              type: 'PAYMENT',
              label: 'Settlement: 0.48 USDC',
              metadata: {
                decision: 'ALLOW',
                status: 'CONFIRMED',
                mode: 'Live Arc Settlement',
                tx_hash: '0x7b2190ee01aa99018442aef992bc4410091bbff1',
              },
            },
          ],
          edges: [
            { source: selectedMissionId, target: 'agent_coordinator_01', type: 'DEPENDS_ON', label: 'Delegates' },
            { source: 'agent_coordinator_01', target: 'hire_research_101', type: 'HIRED', label: 'Hires (Depth 1)' },
            { source: 'hire_research_101', target: 'agent_research_01', type: 'DEPENDS_ON', label: 'Executed By' },
            { source: 'hire_research_101', target: 'pi_res_001', type: 'PAID', label: 'Disburses' },
            { source: 'agent_research_01', target: 'hire_data_102', type: 'HIRED', label: 'Sub-contracts (Depth 2)' },
            { source: 'hire_data_102', target: 'agent_data_01', type: 'DEPENDS_ON', label: 'Executed By' },
            { source: 'hire_data_102', target: 'pi_data_002', type: 'PAID', label: 'Disburses' },
            { source: 'agent_coordinator_01', target: 'hire_val_103', type: 'HIRED', label: 'Hires (Depth 1)' },
            { source: 'hire_val_103', target: 'agent_validator_01', type: 'DEPENDS_ON', label: 'Executed By' },
            { source: 'hire_data_102', target: 'hire_val_103', type: 'VALIDATED_BY', label: 'Verifies Output' },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, [selectedMissionId]);

  // Layout node coordinates automatically for presentation
  const nodePositions = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return {};
    const positions: Record<string, { x: number; y: number }> = {};
    
    // Group nodes by category / depth
    const missionNodes = graph.nodes.filter(n => n.type === 'MISSION');
    const agentNodes = graph.nodes.filter(n => n.type === 'AGENT');
    const hireNodes = graph.nodes.filter(n => n.type === 'HIRE');
    const paymentNodes = graph.nodes.filter(n => n.type === 'PAYMENT');
    const serviceNodes = graph.nodes.filter(n => n.type === 'SERVICE');

    missionNodes.forEach((n, idx) => {
      positions[n.id] = { x: 120, y: 150 + idx * 160 };
    });

    agentNodes.forEach((n, idx) => {
      positions[n.id] = { x: 380, y: 80 + idx * 130 };
    });

    hireNodes.forEach((n, idx) => {
      positions[n.id] = { x: 680, y: 100 + idx * 140 };
    });

    serviceNodes.forEach((n, idx) => {
      positions[n.id] = { x: 950, y: 80 + idx * 130 };
    });

    paymentNodes.forEach((n, idx) => {
      positions[n.id] = { x: 960, y: 240 + idx * 150 };
    });

    return positions;
  }, [graph]);

  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter(n => {
      if (filterType !== 'ALL' && n.type !== filterType) return false;
      if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase()) && !n.id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [graph, filterType, searchQuery]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'MISSION':
        return { border: 'border-teal-500/60', bg: 'bg-teal-950/40', text: 'text-teal-300', dot: 'bg-teal-400' };
      case 'AGENT':
        return { border: 'border-cyan-500/60', bg: 'bg-cyan-950/40', text: 'text-cyan-300', dot: 'bg-cyan-400' };
      case 'HIRE':
        return { border: 'border-amber-500/60', bg: 'bg-amber-950/40', text: 'text-amber-300', dot: 'bg-amber-400' };
      case 'PAYMENT':
        return { border: 'border-emerald-500/60', bg: 'bg-emerald-950/40', text: 'text-emerald-300', dot: 'bg-emerald-400' };
      case 'SERVICE':
        return { border: 'border-purple-500/60', bg: 'bg-purple-950/40', text: 'text-purple-300', dot: 'bg-purple-400' };
      default:
        return { border: 'border-slate-600', bg: 'bg-slate-900', text: 'text-slate-300', dot: 'bg-slate-400' };
    }
  };

  const getEdgeStyle = (type: string) => {
    switch (type) {
      case 'HIRED':
        return { stroke: '#f59e0b', dash: '4,4', width: 2 };
      case 'PAID':
        return { stroke: '#10b981', dash: '', width: 2.5 };
      case 'DEPENDS_ON':
        return { stroke: '#06b6d4', dash: '', width: 1.5 };
      case 'VALIDATED_BY':
        return { stroke: '#a855f7', dash: '3,3', width: 2 };
      case 'PRODUCED':
        return { stroke: '#14b8a6', dash: '', width: 1.5 };
      default:
        return { stroke: '#64748b', dash: '', width: 1 };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Subsystem Guardrails */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Agent-to-Agent Economic Network
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              DAG Visualizer
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous multi-agent discovery, quotes, recursive sub-contracting, and policy-governed Arc USDC disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Security Invariant</span>
            <span className="text-xs font-mono font-medium text-amber-400">MAX_AGENT_CALL_DEPTH: 3</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Settlement Model</span>
            <span className="text-xs font-mono font-medium text-emerald-400">Deterministic Arc Vault</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Mission Selector, Filters & Search */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-mono text-slate-400">Select Mission:</label>
          <select
            value={selectedMissionId}
            onChange={(e) => setSelectedMissionId(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
          >
            {missions.length > 0 ? (
              missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.objective.slice(0, 32)}...
                </option>
              ))
            ) : (
              <option value="demo-mission-01">demo-mission-01 — Global Market Intel</option>
            )}
          </select>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Node Type Filters */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            {['ALL', 'MISSION', 'AGENT', 'HIRE', 'PAYMENT'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  filterType === type
                    ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search nodes or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 w-48"
          />
          <Link
            href="/marketplace"
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition-colors"
          >
            Browse Peer Agents &rarr;
          </Link>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: DAG Graph Canvas */}
        <div className="lg:col-span-2 bg-[#080d19] border border-slate-800 rounded-xl p-4 overflow-hidden relative min-h-[580px] shadow-inner">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-md border border-slate-800 text-[11px] font-mono text-slate-400">
            <span>Vertices: {graph?.nodes.length || 0}</span>
            <span>&bull;</span>
            <span>Edges: {graph?.edges.length || 0}</span>
          </div>

          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> HIRED
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> PAID
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> DEPENDS_ON
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-purple-400 inline-block" /> VALIDATED_BY
            </span>
          </div>

          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-slate-500 font-mono text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full mr-3" />
              Computing Economic DAG topology...
            </div>
          ) : (
            <div className="w-full h-[540px] overflow-auto relative cursor-grab active:cursor-grabbing">
              {/* SVG Edges Layer */}
              <svg className="absolute inset-0 w-[1200px] h-[650px] pointer-events-none">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                  </marker>
                  <marker
                    id="arrowhead-paid"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                  </marker>
                  <marker
                    id="arrowhead-hired"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                  </marker>
                </defs>

                {graph?.edges.map((edge, idx) => {
                  const s = nodePositions[edge.source];
                  const t = nodePositions[edge.target];
                  if (!s || !t) return null;

                  const style = getEdgeStyle(edge.type);
                  const midX = (s.x + t.x) / 2;
                  const midY = (s.y + t.y) / 2;
                  const marker = edge.type === 'PAID' ? 'url(#arrowhead-paid)' : edge.type === 'HIRED' ? 'url(#arrowhead-hired)' : 'url(#arrowhead)';

                  return (
                    <g key={`edge-${idx}`}>
                      <path
                        d={`M ${s.x + 90} ${s.y + 35} C ${midX} ${s.y + 35}, ${midX} ${t.y + 35}, ${t.x} ${t.y + 35}`}
                        fill="none"
                        stroke={style.stroke}
                        strokeWidth={style.width}
                        strokeDasharray={style.dash}
                        markerEnd={marker}
                      />
                      {edge.label && (
                        <text
                          x={midX}
                          y={midY - 4}
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="select-none"
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* HTML Vertices Layer */}
              <div className="w-[1200px] h-[650px] relative pointer-events-auto">
                {filteredNodes.map((node) => {
                  const pos = nodePositions[node.id] || { x: 200, y: 200 };
                  const color = getNodeColor(node.type);
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{
                        position: 'absolute',
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: '180px',
                      }}
                      className={`p-3 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 select-none shadow-lg ${
                        color.bg
                      } ${color.border} ${
                        isSelected
                          ? 'ring-2 ring-teal-400 scale-105 z-20 shadow-teal-500/20'
                          : 'hover:scale-102 hover:border-slate-500 z-10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono font-bold tracking-wider ${color.text} flex items-center gap-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                          {node.type}
                        </span>
                        {node.metadata?.call_depth !== undefined && (
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                            D:{String(node.metadata.call_depth)}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-white truncate" title={node.label}>
                        {node.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {node.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Selected Node Inspector Drawer */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between backdrop-blur-md">
          {selectedNode ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Vertex Audit Inspector
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-teal-300">
                    {selectedNode.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                  {selectedNode.label}
                </h3>
                <p className="text-xs font-mono text-slate-400 break-all mt-0.5">
                  ID: {selectedNode.id}
                </p>
              </div>

              {/* Dynamic Metadata Properties */}
              <div className="space-y-3 border-t border-b border-slate-800/80 py-4">
                <span className="text-xs font-mono font-semibold text-slate-300 block">
                  Authoritative Node Properties:
                </span>
                {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(selectedNode.metadata).map(([key, val]) => (
                      <div key={key} className="flex items-start justify-between text-xs font-mono">
                        <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-white text-right font-medium max-w-[180px] truncate" title={String(val)}>
                          {Array.isArray(val) ? val.join(', ') : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-mono">No supplementary metadata attached.</p>
                )}
              </div>

              {/* Type-Specific Actions */}
              {selectedNode.type === 'HIRE' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Integrity Guard:</span>
                    <span className="text-emerald-400">Injection Free</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Call Recursion:</span>
                    <span className="text-amber-400">Bounded &lt; 3</span>
                  </div>
                </div>
              )}

              {selectedNode.type === 'PAYMENT' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Treasury:</span>
                    <span className="text-emerald-400">Reserved &amp; Settled</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>On-Chain Verification:</span>
                    <span className="text-cyan-400">AgentVault.sol</span>
                  </div>
                </div>
              )}

              {selectedNode.type === 'AGENT' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Keyless Autonomous:</span>
                    <span className="text-emerald-400">Zero Private Keys</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Policy Non-Bypassable:</span>
                    <span className="text-emerald-400">Enforced</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              Click any graph node to inspect live economic parameters.
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              href="/trace"
              className="w-full block text-center py-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20 text-xs font-mono font-medium transition-colors"
            >
              Open Financial Flight Recorder &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
