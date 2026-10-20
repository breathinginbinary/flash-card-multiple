export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string; // ISO-8601 UTC
  user: CurrentUser;
}

/** What is persisted between page loads (SPEC §7.2). */
export type Session = LoginResponse;
