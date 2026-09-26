'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isSimulator = pathname === '/simulator' || pathname.startsWith('/simulator/');

  if (isSimulator) {
    return (
      <div className="w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  );
}
