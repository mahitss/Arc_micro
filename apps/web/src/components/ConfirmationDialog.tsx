'use client';

import React, { useEffect, useRef } from 'react';
import { AddressDisplay } from './AddressDisplay';
import { StatusBadge } from './StatusBadge';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  intent: {
    intent_id: string;
    agent_id: string;
    service: string;
    recipient: string;
    amount: string;
    asset: string;
  };
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isConfirming,
  intent,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isConfirming) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirming, onClose]);

  // Trap scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Amount formatting: 180000 -> 0.18 USDC
  const numericAmount = Number(intent.amount) / 1_000_000;
  const formattedAmount = isNaN(numericAmount) ? intent.amount : numericAmount.toFixed(2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConfirming) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-[#101010] border border-[#222222] rounded-2xl shadow-2xl p-6 text-[#F2F0EA]"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
            <h2 id="dialog-title" className="text-base font-semibold text-[#F2F0EA]">
              Confirm Payment Execution
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-[#716F69] hover:text-[#F2F0EA] text-sm disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <p id="dialog-description" className="text-xs text-[#B0ADA5] mt-3">
          The following payment intent was evaluated and approved by the deterministic Rust Policy Engine. Explicit operator confirmation is required before on-chain execution.
        </p>

        <div className="my-5 p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2.5 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Agent:</span>
            <span className="text-[#F2F0EA] font-semibold">{intent.agent_id}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Service:</span>
            <span className="text-[#F2F0EA]">{intent.service}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Amount:</span>
            <span className="text-[#F2F0EA] font-bold text-sm">
              {formattedAmount} <span className="text-xs text-[#B0ADA5] font-normal">USDC</span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Recipient:</span>
            <AddressDisplay address={intent.recipient} truncate={true} copyable={false} />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Policy Check:</span>
            <StatusBadge status="AUTHORIZED" size="sm" />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#85827B]">Network:</span>
            <span className="text-[#B0ADA5]">Arc Network</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <span className="w-3 h-3 border-2 border-[#080808] border-t-transparent rounded-full animate-spin" />
                <span>Executing on Arc...</span>
              </>
            ) : (
              <span>Confirm Payment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
