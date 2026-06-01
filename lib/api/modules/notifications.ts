import { api } from "@/lib/api/client";
import type { PageRequest, PageResponse } from "@/lib/api/query";

export interface NotificationItem {
  id: string;
  recipientId: string;
  subject: string;
  message: string;
  channel: "INBOX_ONLY" | "EMAIL" | "SMS";
  severity: "INFO" | "WARNING" | "CRITICAL";
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  inbox: (unreadOnly?: boolean, page?: PageRequest) =>
    api.get<PageResponse<NotificationItem>>("/api/v1/inbox", {
      query: {
        unreadOnly: unreadOnly?.toString(),
        page: page?.page,
        size: page?.size,
        sort: page?.sort ?? "createdAt,desc",
      },
    }),
  markAsRead: (id: string) => api.post<void>(`/api/v1/inbox/${id}/read`),
};
