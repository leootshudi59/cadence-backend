import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import {
  SUPABASE_JWKS_CACHE_MAX_AGE_MS,
  SUPABASE_JWKS_COOLDOWN_MS,
  SUPABASE_JWKS_TIMEOUT_MS,
  SUPABASE_JWT_ALGORITHMS,
  UUID_PATTERN,
} from "../constants/auth.constants";
import { SUPABASE_AUTHENTICATED_ROLE } from "../constants/roles.constants";
import type { VerifiedSupabaseClaims, VerifyAccessToken } from "./types";

export interface JwtVerifierSettings {
  audience: string;
  issuer: string;
  jwksUrl: URL;
}

export function createSupabaseJwtVerifier(
  settings: JwtVerifierSettings,
  keyResolver: JWTVerifyGetKey = createRemoteJWKSet(settings.jwksUrl, {
    // Supabase's edge cache and jose both use a ten-minute key lifetime.
    // Constructing this resolver once per process provides the in-memory cache.
    cacheMaxAge: SUPABASE_JWKS_CACHE_MAX_AGE_MS,
    cooldownDuration: SUPABASE_JWKS_COOLDOWN_MS,
    timeoutDuration: SUPABASE_JWKS_TIMEOUT_MS,
  }),
): VerifyAccessToken {
  return async (token) => {
    const { payload } = await jwtVerify(token, keyResolver, {
      algorithms: [...SUPABASE_JWT_ALGORITHMS],
      audience: settings.audience,
      issuer: settings.issuer,
      requiredClaims: ["iss", "aud", "exp", "sub", "role"],
    });

    if (
      typeof payload.sub !== "string" ||
      !UUID_PATTERN.test(payload.sub) ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.role !== SUPABASE_AUTHENTICATED_ROLE
    ) {
      throw new Error("JWT contains invalid authenticated-user claims");
    }

    return payload as VerifiedSupabaseClaims;
  };
}
