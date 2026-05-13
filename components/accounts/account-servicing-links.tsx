"use client";

import Link from "next/link";
import { ArrowLeftRight, Coins, FileText, GitFork, Layers, Percent, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountServicingLinks({ accountId }: { accountId: string }) {
  const base = `/accounts/${accountId}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/balance`}>
          <Scale className="mr-1.5 h-3.5 w-3.5" />
          Balance
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/transactions`}>
          <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
          Transactions
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/statements`}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Statements
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/interest`}>
          <Percent className="mr-1.5 h-3.5 w-3.5" />
          Interest
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/relationships`}>
          <GitFork className="mr-1.5 h-3.5 w-3.5" />
          Relationships
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/holds`}>
          <Layers className="mr-1.5 h-3.5 w-3.5" />
          Holds
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/limits`}>
          <Coins className="mr-1.5 h-3.5 w-3.5" />
          Limits
        </Link>
      </Button>
    </div>
  );
}
