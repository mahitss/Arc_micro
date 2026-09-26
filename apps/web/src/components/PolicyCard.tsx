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
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#F2F0EA]">Deterministic Spending Policy</h3>
          <p className="text-xs text-[#B0ADA5] mt-0.5">
            Enforced by the Rust Policy Engine and on-chain AgentVault controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#716F69] border border-[#222222]">
            Read-Only
          </span>
          <StatusBadge status={policy.enabled ? 'ACTIVE' : 'INACTIVE'} size="sm" />
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-[#85827B]">Daily Spending Budget</span>
          <span className="text-[#F2F0EA]">
            ${dailySpentNum.toFixed(2)} / ${dailyLimitNum.toFixed(2)} USDC ({percentUsed.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#181818] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentUsed > 90 ? 'bg-[#D85C5C]' : percentUsed > 70 ? 'bg-[#D6A83A]' : 'bg-[#D6A83A]'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Detailed Limits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#141414] border border-[#222222] text-xs font-mono">
        <div>
          <div className="text-[#85827B]">Per Transaction</div>
          <div className="text-[#F2F0EA] font-semibold mt-1">${perTxNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-[#85827B]">Daily Limit</div>
          <div className="text-[#F2F0EA] font-semibold mt-1">${dailyLimitNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-[#85827B]">Remaining Today</div>
          <div className="text-[#F2F0EA] font-semibold mt-1">${remainingNum.toFixed(2)} USDC</div>
        </div>

        <div>
          <div className="text-[#85827B]">Transactions Today</div>
          <div className="text-[#B0ADA5] font-semibold mt-1">
            {policy.transactions_today} / {policy.max_transactions_per_day}
          </div>
        </div>
      </div>

      {/* Allowed & Blocked Recipients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222]">
          <div className="font-semibold text-[#F2F0EA] mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            <span>Allowed Recipients ({policy.allowed_recipients.length})</span>
          </div>
          {policy.allowed_recipients.length === 0 ? (
            <span className="text-[#716F69] font-mono text-[11px]">Any recipient allowed</span>
          ) : (
            <div className="space-y-1.5">
              {policy.allowed_recipients.map((addr) => (
                <div key={addr} className="flex items-center justify-between">
                  <AddressDisplay address={addr} truncate={true} copyable={true} />
                  <span className="text-[10px] font-mono text-[#2FB36F]">Whitelisted</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222]">
          <div className="font-semibold text-[#F2F0EA] mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
            <span>Blocked Recipients ({policy.blocked_recipients.length})</span>
          </div>
          {policy.blocked_recipients.length === 0 ? (
            <span className="text-[#716F69] font-mono text-[11px]">No blocked recipients</span>
          ) : (
            <div className="space-y-1.5">
              {policy.blocked_recipients.map((addr) => (
                <div key={addr} className="flex items-center justify-between">
                  <AddressDisplay address={addr} truncate={true} copyable={true} />
                  <span className="text-[10px] font-mono text-[#D85C5C]">Blocked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
