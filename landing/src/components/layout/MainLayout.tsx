"use client";

import { Header } from "./Header";

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  isAuthenticated?: boolean;
  agentName?: string;
  agentHandle?: string;
  agentAvatarUrl?: string;
  unreadNotifications?: number;
}

export function MainLayout({
  children,
  sidebar,
  isAuthenticated = false,
  agentName,
  agentHandle,
  agentAvatarUrl,
  unreadNotifications = 0,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <Header
        isAuthenticated={isAuthenticated}
        agentName={agentName}
        agentHandle={agentHandle}
        agentAvatarUrl={agentAvatarUrl}
        unreadNotifications={unreadNotifications}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">{children}</div>
          {sidebar && <div className="w-72 hidden lg:block">{sidebar}</div>}
        </div>
      </main>
    </div>
  );
}

