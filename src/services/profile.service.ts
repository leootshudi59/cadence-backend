import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { RequestAuth } from "../auth/types";
import { PROFILE_REPOSITORY } from "../constants/repository-tokens.constants";
import { InvalidInputError, NotFoundError } from "../domain/errors";
import { assertIanaZone } from "../domain/time";
import type { PutProfileBody } from "../dtos/profile";
import type { Profile } from "../generated/prisma/client";
import type { IProfileRepository } from "../repositories/interfaces/IProfileRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

/**
 * Validates the email address extracted from the verified Supabase JWT.
 *
 * The profile email is not trusted from the request body: it comes from
 * the authenticated user's verified access-token claims.
 */
const verifiedEmailSchema = z.email();

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: IProfileRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) { }

  /**
  * Returns the profile belonging to the currently authenticated account.
  *
  * The repository query is executed through RlsUnitOfWork so PostgreSQL
  * receives the verified authentication claims and applies its RLS policies.
  *
  * @param auth Verified authentication context of the current request.
  * @returns The current user's Prisma Profile.
  * @throws NotFoundError When no profile exists for the authenticated account.
  */
  findCurrent(auth: RequestAuth): Promise<Profile> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const profile = await this.profileRepository.findById(
        transaction,
        auth.accountId,
      );
      if (profile === null) throw new NotFoundError("Profile");
      return profile;
    });
  }

  /**
   * Creates or fully updates the profile of the currently authenticated account.
   *
   * The account id and email are derived from the verified authentication
   * context rather than trusted from the request body.
   *
   * The supplied home timezone is validated before any database operation.
   * Persistence is then executed inside an RLS-aware transaction.
   *
   * @param auth Verified authentication context of the current request.
   * @param input Validated profile payload received from the API.
   * @returns The created or updated Prisma Profile.
   * @throws InvalidInputError When the JWT email is invalid or the supplied
   * home timezone is not a valid IANA timezone.
   */
  putCurrent(auth: RequestAuth, input: PutProfileBody): Promise<Profile> {
    const email = verifiedEmailSchema.safeParse(auth.claims.email);
    if (!email.success) {
      throw new InvalidInputError(
        "The verified access token does not contain a valid email claim",
      );
    }

    try {
      assertIanaZone(input.homeIanaZone);
    } catch {
      throw new InvalidInputError("homeIanaZone is not a valid IANA time zone");
    }

    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.profileRepository.put(transaction, {
        accountId: auth.accountId,
        email: email.data,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl ?? null,
        locale: input.locale,
        homeIanaZone: input.homeIanaZone,
        baseCurrency: input.baseCurrency,
      }),
    );
  }
}
