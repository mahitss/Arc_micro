'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AgentPaySidebar } from './AgentPaySidebar';

export function AgentPayShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/onboarding';

  if (isPublicRoute) {
    return (
      <main className="min-w-0 flex-1 w-full overflow-x-hidden">
        {children}
      </main>
    );
  }

  return (
    <div className="flex flex-col min-[900px]:flex-row min-h-[calc(100vh-3.5rem)] w-full bg-[#080808] text-[#F2F0EA]">
      {/* Persistent Global AgentPay Command Rail */}
      <AgentPaySidebar />

      {/* Main Route Content Workspace */}
      <main className="min-w-0 flex-1 w-full p-4 sm:p-6 lg:px-8 lg:py-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
