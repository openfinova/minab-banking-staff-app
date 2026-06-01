"use client";

import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  required?: ReadonlyArray<string>;
}

export function AccessDenied({ required = [] }: AccessDeniedProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="You do not have access to this view"
        description={
          required.length > 0
            ? `Required permissions: ${required.join(", ")}. Contact an administrator if you believe you should have access.`
            : "Contact an administrator if you believe you should have access."
        }
        action={
          <Button variant="outline" onClick={() => history.back()}>
            Go back
          </Button>
        }
      />
    </div>
  );
}
