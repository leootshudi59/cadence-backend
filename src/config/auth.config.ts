import { registerAs } from "@nestjs/config";
import { SUPABASE_JWT_AUDIENCE } from "../constants/auth.constants";
import { supabaseProjectFromDatabaseUrl } from "./database.config";

export interface AuthConfiguration {
  readonly audience: typeof SUPABASE_JWT_AUDIENCE;
  readonly issuer: string;
  readonly jwksUrl: URL;
}

export function buildAuthConfiguration(
  databaseUrlValue: string,
): AuthConfiguration {
  const databaseUrl = new URL(databaseUrlValue);
  const { projectRef } = supabaseProjectFromDatabaseUrl(databaseUrl);
  const issuer = `https://${projectRef}.supabase.co/auth/v1`;

  return {
    audience: SUPABASE_JWT_AUDIENCE,
    issuer,
    jwksUrl: new URL(`${issuer}/.well-known/jwks.json`),
  };
}

export const authConfig = registerAs("auth", (): AuthConfiguration => {
  const databaseUrl = process.env["DATABASE_URL"];

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL must be configured");
  }

  return buildAuthConfiguration(databaseUrl);
});
