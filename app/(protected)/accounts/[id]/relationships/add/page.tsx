"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AccountAddRelationshipForm } from "@/components/accounts/account-add-relationship-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Permissions } from "@/lib/rbac/permissions";

export default function AccountAddRelationshipPage() {
  return (
    <RouteGuard permissions={[Permissions.AccountWrite]}>
      <AddRelationshipContent />
    </RouteGuard>
  );
}

function AddRelationshipContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  if (!id) {
    return <EmptyState title="Missing account id" />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/accounts/${id}/relationships`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Relationships
        </Link>
      </Button>
      <PageHeader title="Add relationship" description={`Account ${id}`} />
      <AccountAddRelationshipForm accountId={id} />
    </div>
  );
}
