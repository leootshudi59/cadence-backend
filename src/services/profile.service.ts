import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { RequestAuth } from "../auth/types";
import { PROFILE_REPOSITORY } from "../constants/repository-tokens.constants";
import { InvalidInputError, NotFoundError } from "../domain/errors";
import { assertIanaZone } from "../domain/time";
import type { PutProfileBody } from "../dtos/profile";
import type { IProfileRepository } from "../repositories/interfaces/IProfileRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { ProfileRecord } from "../repositories/types";

const verifiedEmailSchema = z.email();

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: IProfileRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  findCurrent(auth: RequestAuth): Promise<ProfileRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const profile = await this.profileRepository.findById(
        transaction,
        auth.accountId,
      );
      if (profile === null) throw new NotFoundError("Profile");
      return profile;
    });
  }

  putCurrent(auth: RequestAuth, input: PutProfileBody): Promise<ProfileRecord> {
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
