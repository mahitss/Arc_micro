'use client';

import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
}

export function CopyButton({ textToCopy, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-teal-400 hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
      aria-label={`Copy ${label}: ${textToCopy}`}
      title={`Copy ${label}`}
    >
      {copied ? (
        <span className="text-teal-400 font-semibold">Copied!</span>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
