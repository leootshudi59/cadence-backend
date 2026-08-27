import type { JWTPayload } from "jose";

export interface VerifiedSupabaseClaims extends JWTPayload {
  readonly aud: string | string[];
  readonly exp: number;
  readonly iss: string;
  readonly role: "authenticated";
  readonly sub: string;
}

export interface RequestAuth {
  /** Supabase Auth subject. It is the login account UUID, never a traveler UUID. */
  readonly userId: string;
  /** `profiles.id`; intentionally identical to the verified Supabase subject. */
  readonly accountId: string;
  /** `traveler_profiles.id` linked by `account_id`, or null when none exists. */
  readonly travelerProfileId: string | null;
  readonly claims: VerifiedSupabaseClaims;
}

export type VerifyAccessToken = (
  token: string,
) => Promise<VerifiedSupabaseClaims>;
