'use client';

import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import Image from 'next/image';
import Sidebar from './Sidebar';
import { PageSpinner } from '@/components/bits/Spinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageSpinner text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Decorative orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — offset by sidebar on desktop */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 lg:hidden border-b border-white/[0.06] bg-[#0a0a1a]/95 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Portfolio Tracker Logo"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-white">Portfolio Tracker</span>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content — full width */}
        <main className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
    </div>
  );
}
