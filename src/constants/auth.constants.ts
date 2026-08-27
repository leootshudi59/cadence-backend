export const SUPABASE_JWT_AUDIENCE = "authenticated";

export const SUPABASE_JWT_ALGORITHMS = ["ES256", "RS256"] as const;

export const SUPABASE_JWKS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
export const SUPABASE_JWKS_COOLDOWN_MS = 30 * 1000;
export const SUPABASE_JWKS_TIMEOUT_MS = 5 * 1000;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const BEARER_AUTH_SCHEME = "bearerAuth";
export const IS_PUBLIC_ROUTE = "cadence:is-public";
