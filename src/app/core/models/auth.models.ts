import { Workspace } from './organization.models';

export interface LoginRequest {
  email: string;
  password: string;
  workspaceId: string | null;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  /** Fecha ISO 8601 de expiración del token. */
  expiresAt: string;
  user: UserProfile;
  workspace: Workspace;
}
