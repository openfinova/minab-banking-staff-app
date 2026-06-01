"use client";

import Link from "next/link";
import { FileText, Landmark, Mail, MapPin, GitFork, ShieldCheck, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CustomerServicingLinks({ customerId }: { customerId: string }) {
  const base = `/customers/${customerId}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/kyc`}>
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          KYC
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/documents`}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          ID documents
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/contacts`}>
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          Contacts
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/addresses`}>
          <MapPin className="mr-1.5 h-3.5 w-3.5" />
          Addresses
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/relationships`}>
          <GitFork className="mr-1.5 h-3.5 w-3.5" />
          Relationships
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}#customer-bank-accounts`}>
          <Landmark className="mr-1.5 h-3.5 w-3.5" />
          Bank accounts
        </Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`${base}/identity`}>
          <UserCircle className="mr-1.5 h-3.5 w-3.5" />
          Digital banking login
        </Link>
      </Button>
    </div>
  );
}
