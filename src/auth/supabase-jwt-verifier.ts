import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { authConfig } from "../config/auth.config";
import { createSupabaseJwtVerifier } from "./jwt";
import type { VerifiedSupabaseClaims, VerifyAccessToken } from "./types";

/**
 * Process-scoped verifier. Its one jose RemoteJWKSet retains Supabase's JWKS
 * cache; request identity is never retained by this provider.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly verifyAccessToken: VerifyAccessToken;

  constructor(
    @Inject(authConfig.KEY)
    configuration: ConfigType<typeof authConfig>,
  ) {
    this.verifyAccessToken = createSupabaseJwtVerifier({
      audience: configuration.audience,
      issuer: configuration.issuer,
      jwksUrl: configuration.jwksUrl,
    });
  }

  verify(token: string): Promise<VerifiedSupabaseClaims> {
    return this.verifyAccessToken(token);
  }
}
