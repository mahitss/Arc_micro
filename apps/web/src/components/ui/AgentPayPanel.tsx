import React from 'react';

export interface AgentPayPanelProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AgentPayPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}: AgentPayPanelProps) {
  return (
    <section className={`rounded-xl border border-[#222222] bg-[#101010] text-[#F2F0EA] ${className}`}>
      <div className="p-4 sm:p-6 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#F2F0EA]">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
