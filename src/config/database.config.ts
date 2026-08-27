import { registerAs } from "@nestjs/config";
import { RLS_CLIENT_ROLE } from "../constants/roles.constants";

export interface DatabaseConfiguration {
  readonly projectRef: string;
  readonly rlsDatabaseUrl: string;
  readonly runtimeRole: typeof RLS_CLIENT_ROLE;
}

interface DatabaseEnvironment {
  readonly DATABASE_URL?: string | undefined;
  readonly RLS_CLIENT_PASSWORD?: string | undefined;
}

function requiredValue(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} must be configured`);
  }

  return value;
}

function parsePostgresUrl(value: string): URL {
  let databaseUrl: URL;

  try {
    databaseUrl = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (
    databaseUrl.protocol !== "postgres:" &&
    databaseUrl.protocol !== "postgresql:"
  ) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }

  return databaseUrl;
}

export function supabaseProjectFromDatabaseUrl(databaseUrl: URL): {
  readonly projectRef: string;
  readonly usesSharedPooler: boolean;
} {
  const hostname = databaseUrl.hostname.toLowerCase();

  if (hostname.endsWith(".pooler.supabase.com")) {
    let username: string;

    try {
      username = decodeURIComponent(databaseUrl.username);
    } catch {
      throw new Error("DATABASE_URL has an invalid pooler username");
    }

    const separator = username.lastIndexOf(".");
    const projectRef = separator >= 0 ? username.slice(separator + 1) : "";

    if (!/^[a-z0-9]+$/i.test(projectRef)) {
      throw new Error(
        "DATABASE_URL pooler username must include a Supabase project reference",
      );
    }

    return { projectRef, usesSharedPooler: true };
  }

  const directHost = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(hostname);
  const projectRef = directHost?.[1];

  if (projectRef === undefined) {
    throw new Error(
      "DATABASE_URL must target this project's Supabase database",
    );
  }

  return { projectRef, usesSharedPooler: false };
}

export function buildDatabaseConfiguration(
  environment: DatabaseEnvironment,
): DatabaseConfiguration {
  const databaseUrl = parsePostgresUrl(
    requiredValue("DATABASE_URL", environment.DATABASE_URL),
  );
  const rlsClientPassword = requiredValue(
    "RLS_CLIENT_PASSWORD",
    environment.RLS_CLIENT_PASSWORD,
  );
  const { projectRef, usesSharedPooler } =
    supabaseProjectFromDatabaseUrl(databaseUrl);

  if (usesSharedPooler && databaseUrl.port !== "6543") {
    throw new Error(
      "DATABASE_URL must use the shared pooler's transaction-mode port 6543",
    );
  }

  const rlsDatabaseUrl = new URL(databaseUrl);
  rlsDatabaseUrl.username = usesSharedPooler
    ? `${RLS_CLIENT_ROLE}.${projectRef}`
    : RLS_CLIENT_ROLE;
  rlsDatabaseUrl.password = rlsClientPassword;

  return {
    projectRef,
    rlsDatabaseUrl: rlsDatabaseUrl.toString(),
    runtimeRole: RLS_CLIENT_ROLE,
  };
}

export const databaseConfig = registerAs(
  "database",
  (): DatabaseConfiguration =>
    buildDatabaseConfiguration({
      DATABASE_URL: process.env["DATABASE_URL"],
      RLS_CLIENT_PASSWORD: process.env["RLS_CLIENT_PASSWORD"],
    }),
);
