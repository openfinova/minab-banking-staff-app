import { api } from "@/lib/api/client";

export interface RoleSummary {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  systemRole?: boolean;
  permissionCount?: number;
}

export interface RoleDetail extends RoleSummary {
  permissions: string[];
}

export interface PermissionInfo {
  name: string;
  authority?: string;
  description?: string;
  category?: string;
}

export interface CreateRoleRequest {
  name: string;
  displayName?: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
}

export const rolesApi = {
  list: () => api.get<RoleSummary[]>("/api/v1/identity/roles"),
  get: (id: string) => api.get<RoleDetail>(`/api/v1/identity/roles/${id}`),
  permissionsCatalog: () =>
    api.get<PermissionInfo[]>("/api/v1/identity/roles/permissions"),
  create: (body: CreateRoleRequest) =>
    api.post<RoleDetail>("/api/v1/identity/roles", body),
  update: (id: string, body: UpdateRoleRequest) =>
    api.put<RoleDetail>(`/api/v1/identity/roles/${id}`, body),
  delete: (id: string) => api.delete<void>(`/api/v1/identity/roles/${id}`),
  setPermissions: (id: string, permissions: string[]) =>
    api.put<RoleDetail>(`/api/v1/identity/roles/${id}/permissions`, { permissions }),
  addPermissions: (id: string, permissions: string[]) =>
    api.patch<RoleDetail>(`/api/v1/identity/roles/${id}/permissions/add`, { permissions }),
  removePermissions: (id: string, permissions: string[]) =>
    api.patch<RoleDetail>(`/api/v1/identity/roles/${id}/permissions/remove`, { permissions }),
};
