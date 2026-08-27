import { describe, expect, it } from "vitest";
import {
  loadRuntimeEnvironment,
  RLS_CLIENT_ROLE,
  SUPABASE_JWT_AUDIENCE,
} from "./environment";

describe("loadRuntimeEnvironment", () => {
  it("derives auth endpoints and an encoded rls_client pooler URL", () => {
    const projectRef = "abcdefghijklmnopqrst";
    const environment = loadRuntimeEnvironment({
      DATABASE_URL: `postgresql://postgres.${projectRef}:privileged@aws-0-eu.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      RLS_CLIENT_PASSWORD: "rls p@ss/word",
    });

    expect(environment.projectRef).toBe(projectRef);
    expect(environment.jwtIssuer).toBe(
      `https://${projectRef}.supabase.co/auth/v1`,
    );
    expect(environment.jwksUrl.href).toBe(
      `https://${projectRef}.supabase.co/auth/v1/.well-known/jwks.json`,
    );
    expect(environment.jwtAudience).toBe(SUPABASE_JWT_AUDIENCE);

    const runtimeUrl = new URL(environment.rlsDatabaseUrl);
    expect(decodeURIComponent(runtimeUrl.username)).toBe(
      `${RLS_CLIENT_ROLE}.${projectRef}`,
    );
    expect(decodeURIComponent(runtimeUrl.password)).toBe("rls p@ss/word");
    expect(runtimeUrl.searchParams.get("pgbouncer")).toBe("true");
  });

  it("refuses the shared pooler's session-mode port", () => {
    expect(() =>
      loadRuntimeEnvironment({
        DATABASE_URL:
          "postgresql://postgres.abcdefghijklmnopqrst:privileged@aws-0-eu.pooler.supabase.com:5432/postgres",
        RLS_CLIENT_PASSWORD: "secret",
      }),
    ).toThrow(/transaction-mode port 6543/);
  });
});
