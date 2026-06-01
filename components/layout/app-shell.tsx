"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { IdleTimeoutWatcher } from "@/lib/auth/use-idle-warning";

import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-auto px-6 py-6 scrollbar-thin">
          <AppBreadcrumbs />
          {children}
        </main>
      </div>
      <IdleTimeoutWatcher />
    </div>
  );
}
