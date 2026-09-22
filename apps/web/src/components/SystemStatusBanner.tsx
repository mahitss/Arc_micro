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
      <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        ENV: DEV-SANDBOX
      </span>

      {/* Organization Badge */}
      <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        ORG: DEFAULT
      </span>

      {/* Gateway Telemetry Indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] bg-slate-900 border-slate-800">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isGatewayOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span className={isGatewayOnline ? 'text-slate-300' : 'text-rose-400'}>
          {isGatewayOnline ? 'GATEWAY: LIVE' : 'GATEWAY: OFFLINE'}
        </span>
      </div>

      {/* Arc Settlement Network Indicator */}
      {isLiveMainnet ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>ARC MAINNET (5042)</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>ARC MAINNET: NOT CONNECTED / SIMULATION</span>
        </span>
      )}
    </div>
  );
}
