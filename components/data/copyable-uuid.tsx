"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RX.test(value.trim());
}

type CopyableUuidProps = {
  value?: string | null;
  href?: string;
  /** Show first 8 characters plus ellipsis. Full value remains on title and clipboard. */
  truncate?: boolean;
  className?: string;
  /** Prevent row-level click handlers from firing when copying or following the link. */
  stopPropagation?: boolean;
};

export function CopyableUuid({
  value,
  href,
  truncate = true,
  className,
  stopPropagation = false,
}: CopyableUuidProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const id = value?.trim() ?? "";

  if (!id) {
    return <span className={className}>—</span>;
  }

  const label = truncate && id.length > 8 ? `${id.slice(0, 8)}…` : id;

  const copy = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast({ title: "Copied", description: "UUID copied to clipboard." });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Clipboard permission denied.",
      });
    }
  };

  const labelNode = href ? (
    <Link
      href={href}
      className="text-primary hover:underline"
      title={id}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {label}
    </Link>
  ) : (
    <span title={id}>{label}</span>
  );

  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-xs", className)}>
      {labelNode}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Copy UUID"
        title="Copy UUID"
        onClick={copy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </span>
  );
}
