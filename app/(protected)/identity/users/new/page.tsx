"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { CreateUserForm } from "@/components/identity/create-user-form";

export default function NewUserPage() {
  return (
    <RouteGuard permissions={[Permissions.AdminUsersWrite]}>
      <NewUserContent />
    </RouteGuard>
  );
}

function NewUserContent() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create user"
        description="Provision a new staff or customer account. Fields depend on user type."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm onCancel={() => router.back()} />
        </CardContent>
      </Card>
    </div>
  );
}
