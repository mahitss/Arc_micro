import React from 'react';
import { AgentPolicy } from '../lib/api/types';
import { AddressDisplay } from './AddressDisplay';
import { StatusBadge } from './StatusBadge';

interface PolicyCardProps {
  policy: AgentPolicy;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  const dailyLimitNum = Number(policy.daily_spending_limit) / 1_000_000;
  const dailySpentNum = Number(policy.daily_spent) / 1_000_000;
  const remainingNum = Number(policy.remaining_daily_limit) / 1_000_000;
  const perTxNum = Number(policy.per_transaction_limit) / 1_000_000;

  const percentUsed = dailyLimitNum > 0 ? Math.min(100, (dailySpentNum / dailyLimitNum) * 100) : 0;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Deterministic Spending Policy</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Enforced by the Rust Policy Engine and on-chain AgentVault controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Read-Only
          </span>
          <StatusBadge status={policy.enabled ? 'ACTIVE' : 'INACTIVE'} size="sm" />
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-slate-400">Daily Spending Budget</span>
          <span className="text-slate-200">
            ${dailySpentNum.toFixed(2)} / ${dailyLimitNum.toFixed(2)} USDC ({percentUsed.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentUsed > 90 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-400' : 'bg-teal-400'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Detailed Limits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/60 text-xs font-mono">
        <div>
          <div className="text-slate-500">Per Transaction</div>
          <div className="text-white font-semibold mt-1">${perTxNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-slate-500">Daily Limit</div>
          <div className="text-white font-semibold mt-1">${dailyLimitNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-slate-500">Remaining Today</div>
          <div className="text-teal-400 font-semibold mt-1">${remainingNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-slate-500">Transactions Today</div>
          <div className="text-slate-200 font-semibold mt-1">
            {policy.transactions_today} / {policy.max_transactions_per_day}
          </div>
        </div>
      </div>

      {/* Allowed & Blocked Recipients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="font-semibold text-slate-200 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Allowed Recipients ({policy.allowed_recipients.length})</span>
          </div>
          {policy.allowed_recipients.length === 0 ? (
            <span className="text-slate-500 font-mono text-[11px]">Any recipient allowed</span>
          ) : (
            <div className="space-y-1.5">
              {policy.allowed_recipients.map((addr) => (
                <div key={addr} className="flex items-center justify-between">
                  <AddressDisplay address={addr} truncate={true} copyable={true} />
                  <span className="text-[10px] font-mono text-emerald-400">Whitelisted</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="font-semibold text-slate-200 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Blocked Recipients ({policy.blocked_recipients.length})</span>
          </div>
          {policy.blocked_recipients.length === 0 ? (
            <span className="text-slate-500 font-mono text-[11px]">No blocked recipients</span>
          ) : (
            <div className="space-y-1.5">
              {policy.blocked_recipients.map((addr) => (
                <div key={addr} className="flex items-center justify-between">
                  <AddressDisplay address={addr} truncate={true} copyable={true} />
                  <span className="text-[10px] font-mono text-rose-400">Blocked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
