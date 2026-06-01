"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MailOpen, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notificationsApi } from "@/lib/api/modules/notifications";
import { Badge } from "@/components/ui/badge";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "inbox", unreadOnly],
    queryFn: () => notificationsApi.inbox(unreadOnly, { size: 50 }),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "WARNING":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Internal Inbox</h2>
          <p className="text-muted-foreground">
            Personal messages plus shared queues (for example AML alerts sent to COMPLIANCE_INBOX when you have{" "}
            <code className="text-xs">notification:read</code> or <code className="text-xs">compliance:alert:read</code>
            ).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </Button>
          <Button
            variant={!unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>You have {data?.content.filter(n => !n.read).length ?? 0} unread messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading inbox...</p>
          ) : data?.content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MailOpen className="h-12 w-12 mb-4 opacity-20" />
              <p>No messages found.</p>
            </div>
          ) : (
            data?.content.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${
                  !item.read ? "bg-muted/50 font-medium" : "opacity-75"
                }`}
              >
                <div className="flex gap-4">
                  <div className="mt-1">{getSeverityIcon(item.severity)}</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.subject}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "PPp")}
                      </span>
                      {!item.read && <Badge variant="secondary">New</Badge>}
                    </div>
                  </div>
                </div>
                {!item.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate(item.id)}
                    disabled={markRead.isPending}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
