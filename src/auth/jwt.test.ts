import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWK,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createSupabaseJwtVerifier } from "./jwt";

const issuer = "https://abcdefghijklmnopqrst.supabase.co/auth/v1";
const audience = "authenticated";
const userId = "10000000-0000-4000-8000-000000000001";

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let verifier: ReturnType<typeof createSupabaseJwtVerifier>;

async function signedToken(options?: {
  expiresAt?: number;
  issuer?: string;
  audience?: string;
  role?: string;
  signingKey?: CryptoKey;
}) {
  return new SignJWT({ role: options?.role ?? "authenticated" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(options?.issuer ?? issuer)
    .setAudience(options?.audience ?? audience)
    .setSubject(userId)
    .setExpirationTime(options?.expiresAt ?? 4_102_444_800)
    .sign(options?.signingKey ?? privateKey);
}

beforeAll(async () => {
  const keys = await generateKeyPair("ES256");
  const otherKeys = await generateKeyPair("ES256");
  const publicJwk: JWK = {
    ...(await exportJWK(keys.publicKey)),
    alg: "ES256",
    kid: "test-key",
    use: "sig",
  };

  privateKey = keys.privateKey;
  otherPrivateKey = otherKeys.privateKey;
  verifier = createSupabaseJwtVerifier(
    {
      audience,
      issuer,
      jwksUrl: new URL(`${issuer}/.well-known/jwks.json`),
    },
    createLocalJWKSet({ keys: [publicJwk] }),
  );
});

describe("Supabase JWT verification", () => {
  it("accepts a correctly signed, unexpired authenticated-user token", async () => {
    const claims = await verifier(await signedToken());

    expect(claims.sub).toBe(userId);
    expect(claims.role).toBe("authenticated");
  });

  it.each([
    ["issuer", { issuer: "https://wrong.example/auth/v1" }],
    ["audience", { audience: "anon" }],
    ["expiry", { expiresAt: 1 }],
    ["role", { role: "service_role" }],
  ] as const)("rejects a token with the wrong %s", async (_name, options) => {
    await expect(verifier(await signedToken(options))).rejects.toThrow();
  });

  it("rejects a token signed by an untrusted key", async () => {
    await expect(
      verifier(await signedToken({ signingKey: otherPrivateKey })),
    ).rejects.toThrow();
  });
});
