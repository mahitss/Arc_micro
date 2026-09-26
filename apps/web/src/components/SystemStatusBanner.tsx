'use client';

import React, { useEffect, useState } from 'react';
import { fetchSystemHealth } from '../lib/api/health';
import { SystemHealth } from '../lib/api/types';

export function SystemStatusBanner() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    fetchSystemHealth().then(setHealth).catch(() => null);
    const interval = setInterval(() => {
      fetchSystemHealth().then(setHealth).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isLiveMainnet = health?.is_mainnet_verified || false;
  const isGatewayOnline = health?.gateway === 'HEALTHY';

  return (
    <div className="flex items-center gap-2.5 font-mono text-xs">
      {/* Environment Badge */}
      <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-[#101010] text-[#a3a3a3] border border-[#222222]">
        ENV DEV-SANDBOX
      </span>

      {/* Organization Badge */}
      <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-[#101010] text-[#a3a3a3] border border-[#222222]">
        ORG DEFAULT
      </span>

      {/* Gateway Telemetry Indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] bg-[#101010] border border-[#222222]">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isGatewayOnline ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
          }`}
        />
        <span className={isGatewayOnline ? 'text-[#f5f5f5]' : 'text-[#ef4444]'}>
          {isGatewayOnline ? 'GATEWAY ONLINE' : 'GATEWAY OFFLINE'}
        </span>
      </div>

      {/* Arc Settlement Network Indicator */}
      {isLiveMainnet ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium uppercase bg-[#101010] text-[#f5f5f5] border border-[#222222]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>ARC MAINNET · 5042</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium uppercase bg-[#101010] text-[#a3a3a3] border border-[#222222]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          <span>ARC SIMULATION · 5042</span>
        </span>
      )}
    </div>
  );
}
