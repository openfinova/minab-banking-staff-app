"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Moon, Sun, UserCircle, Search, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-provider";
import { Input } from "@/components/ui/input";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { TopbarNotificationsBell } from "@/components/layout/topbar-notifications";

export function Topbar() {
  const { session, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initials = React.useMemo(() => {
    const name = session?.user.displayName ?? session?.user.username ?? "?";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  }, [session]);

  return (
    <>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-6 backdrop-blur">
        <div className="hidden md:block md:flex-1 md:max-w-md">
          <div className="relative flex gap-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              className="w-full text-left cursor-text"
              onClick={() => setSearchOpen(true)}
              aria-label="Open workspace search"
            >
              <Input
                readOnly
                type="search"
                placeholder="Search workspace… (Ctrl+K)"
                className="pointer-events-none pl-8"
                tabIndex={-1}
              />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inbox" className="inline-flex">
            <Button variant="ghost" size="sm" className="gap-2 px-2 md:px-3" aria-label="Internal inbox">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm md:inline">Inbox</span>
            </Button>
          </Link>
          <TopbarNotificationsBell />
          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <span className="hidden text-sm font-medium md:inline">
                  {session?.user.displayName ?? session?.user.username}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {session?.user.email ?? session?.user.username}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account/profile" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void logout()}>
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
