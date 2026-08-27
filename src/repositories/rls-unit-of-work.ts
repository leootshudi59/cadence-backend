import { Injectable } from "@nestjs/common";
import type { RequestAuth, VerifiedSupabaseClaims } from "../auth/types";
import { SUPABASE_AUTHENTICATED_ROLE } from "../constants/roles.constants";
import { PrismaService } from "./prisma.service";
import type { RlsOperation } from "./types";

@Injectable()
export class RlsUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  execute<T>(auth: RequestAuth, operation: RlsOperation<T>): Promise<T> {
    if (
      auth.userId !== auth.claims.sub ||
      auth.accountId !== auth.claims.sub ||
      auth.claims.role !== SUPABASE_AUTHENTICATED_ROLE
    ) {
      return Promise.reject(new Error("Invalid verified request identity"));
    }

    return this.executeWithVerifiedClaims(auth.claims, operation);
  }

  /** Used only while the auth guard resolves the account's traveler identity. */
  executeWithVerifiedClaims<T>(
    claims: VerifiedSupabaseClaims,
    operation: RlsOperation<T>,
  ): Promise<T> {
    if (claims.role !== SUPABASE_AUTHENTICATED_ROLE) {
      return Promise.reject(new Error("Invalid verified Supabase role"));
    }

    return this.prisma.$transaction(async (transaction) => {
      const serializedClaims = JSON.stringify(claims);

      await transaction.$queryRaw`
        SELECT set_config('request.jwt.claims', ${serializedClaims}, TRUE)
      `;

      return operation(transaction);
    });
  }
}
