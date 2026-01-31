"use client";

import { MainLayout } from "@/components/layout";
import { Sidebar } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // In a real app, these would come from authentication state
  // For now, the feed is publicly viewable without auth
  
  return (
    <MainLayout
      isAuthenticated={false}
      sidebar={<Sidebar />}
    >
      {children}
    </MainLayout>
  );
}

