export interface AuthTokenClaims {
  sub?: string;
  preferred_username?: string;
  username?: string;
  name?: string;
  email?: string;
  scope?: string;
  permissions?: string[] | string;
  authorities?: string[] | string;
  roles?: string[];
  user_type?: string;
  branch_code?: string;
  employee_id?: string;
  force_password_change?: boolean;
  mfa_required?: boolean;
  mfa_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

export interface AuthUser {
  subject: string;
  username: string;
  displayName: string;
  email?: string;
  permissions: string[];
  roles: string[];
  forcePasswordChange: boolean;
  mfaRequired: boolean;
  mfaVerified: boolean;
  branchCode?: string;
  employeeId?: string;
  userType?: string;
  /** OIDC acr claim — assurance level used during authentication (e.g. gold = MFA completed). */
  acr?: string;
}

/** Browser-visible session (tokens remain server-side in the BFF). */
export interface AuthSession {
  expiresAt: number;
  user: AuthUser;
}

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "force-password-change"
  | "error";
