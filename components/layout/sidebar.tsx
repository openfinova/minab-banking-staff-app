"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NavGuard } from "@/components/rbac/nav-guard";
import { navSections } from "@/lib/nav/navigation";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const defaultOpen = React.useMemo(() => {
    const open = navSections.find((s) =>
      s.items.some((item) => pathname?.startsWith(item.href)),
    );
    return open ? [open.id] : [navSections[0]?.id].filter(Boolean);
  }, [pathname]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-card/40">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">Minab</span>
          <span className="text-xs text-muted-foreground leading-tight">Management Portal</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-1">
          {navSections.map((section) => (
            <NavGuard
              key={section.id}
              permissions={section.permissions ?? []}
              mode="any"
            >
              <AccordionItem value={section.id} className="rounded-md border-0">
                <AccordionTrigger className="items-start rounded-md py-2 hover:bg-accent [&>svg]:mt-1">
                  <span className="flex min-w-0 flex-1 items-start gap-2 text-left">
                    {section.icon ? (
                      <section.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span
                      className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug"
                      title={section.title ?? section.label}
                    >
                      {section.label}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-3">
                  <ul className="flex flex-col gap-0.5 border-l pl-2">
                    {section.items.map((item) => (
                      <NavGuard
                        key={item.href}
                        permissions={item.permissions ?? []}
                        mode={item.permissionMode ?? "all"}
                      >
                        <li>
                          <SidebarLink
                            href={item.href}
                            icon={item.icon ? <item.icon className="h-4 w-4" /> : null}
                            label={item.label}
                            title={item.title}
                            active={pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false)}
                          />
                        </li>
                      </NavGuard>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </NavGuard>
          ))}
        </Accordion>
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        Internal use only - admin & staff
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  title,
  icon,
  active,
}: {
  href: string;
  label: string;
  title?: string;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title ?? label}
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
      <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{label}</span>
    </Link>
  );
}
