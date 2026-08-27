import { config as loadDotEnv } from "dotenv";
import { SUPABASE_JWT_AUDIENCE } from "../constants/auth.constants";
import { RLS_CLIENT_ROLE } from "../constants/roles.constants";
import { buildAuthConfiguration } from "./auth.config";
import { buildDatabaseConfiguration } from "./database.config";

loadDotEnv({ quiet: true });

interface EnvironmentSource {
  DATABASE_URL?: string;
  RLS_CLIENT_PASSWORD?: string;
}

export interface RuntimeEnvironment {
  jwtAudience: typeof SUPABASE_JWT_AUDIENCE;
  jwtIssuer: string;
  jwksUrl: URL;
  projectRef: string;
  rlsDatabaseUrl: string;
}

function requiredValue(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} must be configured`);
  }

  return value;
}

export function hasRlsRuntimeEnvironment(
  environment: EnvironmentSource = process.env,
): boolean {
  return Boolean(
    environment.DATABASE_URL && environment.RLS_CLIENT_PASSWORD?.length,
  );
}

export function loadRuntimeEnvironment(
  environment: EnvironmentSource = process.env,
): RuntimeEnvironment {
  const database = buildDatabaseConfiguration(environment);
  const auth = buildAuthConfiguration(
    requiredValue("DATABASE_URL", environment.DATABASE_URL),
  );

  return {
    jwtAudience: auth.audience,
    jwtIssuer: auth.issuer,
    jwksUrl: auth.jwksUrl,
    projectRef: database.projectRef,
    rlsDatabaseUrl: database.rlsDatabaseUrl,
  };
}

export { RLS_CLIENT_ROLE, SUPABASE_JWT_AUDIENCE };
