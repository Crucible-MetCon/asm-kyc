export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface UserProfile {
  full_name: string;
  counterparty_type: string;
  home_language: string;
}

export interface MeResponse {
  id: string;
  username: string;
  role: string;
  profile: UserProfile | null;
}
