'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  href?: string;
  action?: () => void;
  icon: string;
  shortcut?: string;
}

export function AgentPayCommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    {
      id: 'control',
      title: 'Open Control Tower',
      category: 'NAVIGATION',
      href: '/control',
      icon: '⎈',
      shortcut: 'G C',
    },
    {
      id: 'missions',
      title: 'View Active Missions',
      category: 'NAVIGATION',
      href: '/missions',
      icon: '◈',
      shortcut: 'G M',
    },
    {
      id: 'new-mission',
      title: 'Create New Mission',
      category: 'ACTIONS',
      href: '/missions',
      icon: '＋',
    },
    {
      id: 'marketplace',
      title: 'Open Marketplace & Discovery',
      category: 'NAVIGATION',
      href: '/marketplace',
      icon: '⇄',
    },
    {
      id: 'agents',
      title: 'Search Agent Directory',
      category: 'NAVIGATION',
      href: '/network',
      icon: '⛶',
    },
    {
      id: 'treasury',
      title: 'Open Treasury & Liquidity',
      category: 'NAVIGATION',
      href: '/treasury',
      icon: '🏦',
      shortcut: 'G T',
    },
    {
      id: 'clearing',
      title: 'Open Autonomous Clearinghouse',
      category: 'NAVIGATION',
      href: '/economy/clearing',
      icon: '⚖',
    },
    {
      id: 'simulator',
      title: 'Open Digital Twin Simulator',
      category: 'NAVIGATION',
      href: '/simulator',
      icon: '⚗',
      shortcut: 'G S',
    },
    {
      id: 'run-sim',
      title: 'Run Monte Carlo Risk Simulation',
      category: 'ACTIONS',
      href: '/control/autonomy',
      icon: '▶',
    },
    {
      id: 'security',
      title: 'Open Security & Invariants',
      category: 'NAVIGATION',
      href: '/security',
      icon: '🛡',
    },
    {
      id: 'constitution',
      title: 'View Economic Constitution',
      category: 'NAVIGATION',
      href: '/constitution',
      icon: '📜',
    },
    {
      id: 'approvals',
      title: 'Inspect Pending Approvals',
      category: 'NAVIGATION',
      href: '/approvals',
      icon: '✓',
    },
    {
      id: 'incidents',
      title: 'View Autonomous Incidents & Recovery',
      category: 'NAVIGATION',
      href: '/incidents',
      icon: '⚠',
    },
    {
      id: 'ai-provider',
      title: 'View AI Provider & Model Routing',
      category: 'NAVIGATION',
      href: '/settings/ai',
      icon: '✦',
    },
    {
      id: 'arc',
      title: 'Inspect Arc Mainnet Status',
      category: 'NAVIGATION',
      href: '/arc',
      icon: '▲',
    },
    {
      id: 'activity',
      title: 'Open Universal Activity Stream',
      category: 'NAVIGATION',
      href: '/activity',
      icon: '☰',
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  const executeCommand = (cmd: CommandItem) => {
    onClose();
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#101010] border border-[#2B2B2B] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#F2F0EA] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#222222] flex items-center gap-3 bg-[#0A0A0A]">
          <span className="text-sm font-mono text-[#D6A83A]">⌘</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search systems... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-[#F2F0EA] placeholder-[#716F69] focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#716F69] border border-[#222222]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#716F69]">
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#181818] text-[#F2F0EA] border border-[#2B2B2B]'
                      : 'text-[#B0ADA5] hover:bg-[#141414] hover:text-[#F2F0EA] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-mono shrink-0 w-4 text-center ${
                        isSelected ? 'text-[#D6A83A]' : 'text-[#716F69]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium text-[#F2F0EA]">{item.title}</span>
                    <span className="text-[10px] font-mono text-[#716F69] uppercase">
                      {item.category}
                    </span>
                  </div>
                  {item.shortcut && (
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#716F69] border border-[#222222]">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#222222] bg-[#0A0A0A] flex items-center justify-between text-[11px] text-[#716F69] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-[#D6A83A]">AGENTPAY COMMAND PALETTE</span>
        </div>
      </div>
    </div>
  );
}
