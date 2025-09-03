export interface UpdateProfileRequest {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface UserSession {
  id: string;
  session_token: string;
  created_at: string;
  last_accessed_at: string;
  expires_at: string;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
  location: {
    city: string;
    state: string;
    country: string;
    country_code: string;
    is_vpn: boolean;
    is_tor: boolean;
    is_proxy: boolean;
    is_datacenter: boolean;
    is_mobile: boolean;
    risk_score: number;
  };
  is_active: boolean;
  is_current: boolean;
  location_display: string;
  security_flags: {
    is_vpn: boolean;
    is_tor: boolean;
    is_proxy: boolean;
    is_datacenter: boolean;
    is_mobile: boolean;
    risk_score: number;
  };
}

export interface OAuthAccount {
  id: string;
  provider: 'google' | 'microsoft' | 'github' | 'linkedin';
  provider_id: string;
  provider_email?: string;
  provider_username?: string;
  linked_at: string;
}

export interface LinkOAuthRequest {
  provider: 'google' | 'microsoft' | 'github' | 'linkedin';
  provider_id: string;
  provider_email?: string;
  provider_username?: string;
  raw_profile?: any;
  access_token?: string;
  requireValidation?: boolean;
}

export interface Enable2FAResponse {
  secret: string;
  otpauth_url: string;
  qrcode_data_url: string;
  backup_codes: string[];
}

export interface BackupCodesResponse {
  codes: string[];
}

export interface PhoneVerificationRequest {
  phone: string;
}

export interface PhoneVerificationResponse {
  phone: string;
}

export interface VerifyPhoneRequest {
  code: string;
}

export interface VerifyPhoneResponse {
  phone: string;
  verified: boolean;
}

export interface SecurityInfo {
  failed_login_attempts: number;
  is_locked: boolean;
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  two_factor_enabled: boolean;
  phone_verified: boolean;
  email_verified: boolean;
}
