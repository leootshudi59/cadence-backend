import { Inject, Injectable } from "@nestjs/common";
import type { RequestAuth } from "../auth/types";
import { TRAVELER_REPOSITORY } from "../constants/repository-tokens.constants";
import {
  ConflictError,
  NotFoundError,
  UniqueConstraintViolationError,
} from "../domain/errors";
import { dateOnlyToStoredDate, timeOnlyToStoredDate } from "../domain/time";
import type { CreateTravelerBody, UpdateTravelerBody } from "../dtos/traveler";
import type { TravelerProfile } from "../generated/prisma/client";
import type {
  ITravelerRepository,
  TravelerPersistenceInput,
  TravelerUpdatePersistenceInput,
} from "../repositories/interfaces/ITravelerRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

/**
 * Converts a validated traveler creation DTO into the persistence input
 * expected by the traveler repository.
 *
 * API date/time strings are converted into the database-compatible values
 * used by Prisma before persistence.
 */
function createPersistenceInput(
  auth: RequestAuth,
  input: CreateTravelerBody,
): TravelerPersistenceInput {
  return {
    ownerId: auth.accountId,
    accountId: input.linkToAuthenticatedAccount ? auth.accountId : null,
    firstName: input.firstName,
    lastName: input.lastName,

    birthDate:
      input.birthDate === undefined || input.birthDate === null
        ? null
        : dateOnlyToStoredDate(input.birthDate),

    nationality: input.nationality ?? null,
    residenceCountry: input.residenceCountry ?? null,

    earliestWakeTime:
      input.earliestWakeTime === undefined || input.earliestWakeTime === null
        ? null
        : timeOnlyToStoredDate(input.earliestWakeTime),

    latestEndTime:
      input.latestEndTime === undefined || input.latestEndTime === null
        ? null
        : timeOnlyToStoredDate(input.latestEndTime),

    maxActivitiesPerDay: input.maxActivitiesPerDay ?? null,
    breakMinutesPerDay: input.breakMinutesPerDay ?? null,
    napRequired: input.napRequired,

    napWindowStart:
      input.napWindowStart === undefined || input.napWindowStart === null
        ? null
        : timeOnlyToStoredDate(input.napWindowStart),

    napWindowEnd:
      input.napWindowEnd === undefined || input.napWindowEnd === null
        ? null
        : timeOnlyToStoredDate(input.napWindowEnd),

    prefersLocalOverTouristic: input.prefersLocalOverTouristic,
    notes: input.notes ?? null,
  };
}

/**
 * Converts a validated partial traveler update DTO into the persistence
 * input expected by the repository.
 *
 * Only fields explicitly supplied by the caller are included so omitted
 * properties are not accidentally overwritten.
 */
function updatePersistenceInput(
  input: UpdateTravelerBody,
): TravelerUpdatePersistenceInput {
  const persistenceInput: TravelerUpdatePersistenceInput = {};

  if (input.firstName !== undefined) {
    persistenceInput.firstName = input.firstName;
  }

  if (input.lastName !== undefined) {
    persistenceInput.lastName = input.lastName;
  }

  if (input.nationality !== undefined) {
    persistenceInput.nationality = input.nationality;
  }

  if (input.residenceCountry !== undefined) {
    persistenceInput.residenceCountry = input.residenceCountry;
  }

  if (input.maxActivitiesPerDay !== undefined) {
    persistenceInput.maxActivitiesPerDay = input.maxActivitiesPerDay;
  }

  if (input.breakMinutesPerDay !== undefined) {
    persistenceInput.breakMinutesPerDay = input.breakMinutesPerDay;
  }

  if (input.napRequired !== undefined) {
    persistenceInput.napRequired = input.napRequired;
  }

  if (input.prefersLocalOverTouristic !== undefined) {
    persistenceInput.prefersLocalOverTouristic =
      input.prefersLocalOverTouristic;
  }

  if (input.notes !== undefined) {
    persistenceInput.notes = input.notes;
  }

  if (input.birthDate !== undefined) {
    persistenceInput.birthDate =
      input.birthDate === null
        ? null
        : dateOnlyToStoredDate(input.birthDate);
  }

  if (input.earliestWakeTime !== undefined) {
    persistenceInput.earliestWakeTime =
      input.earliestWakeTime === null
        ? null
        : timeOnlyToStoredDate(input.earliestWakeTime);
  }

  if (input.latestEndTime !== undefined) {
    persistenceInput.latestEndTime =
      input.latestEndTime === null
        ? null
        : timeOnlyToStoredDate(input.latestEndTime);
  }

  if (input.napWindowStart !== undefined) {
    persistenceInput.napWindowStart =
      input.napWindowStart === null
        ? null
        : timeOnlyToStoredDate(input.napWindowStart);
  }

  if (input.napWindowEnd !== undefined) {
    persistenceInput.napWindowEnd =
      input.napWindowEnd === null
        ? null
        : timeOnlyToStoredDate(input.napWindowEnd);
  }

  return persistenceInput;
}

@Injectable()
export class TravelerService {
  constructor(
    @Inject(TRAVELER_REPOSITORY)
    private readonly travelerRepository: ITravelerRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) { }

  /**
   * Creates a traveler owned by the currently authenticated account.
   *
   * When requested, the traveler can also be linked to the authenticated
   * account itself. Only one traveler may be linked to that account.
   *
   * @param auth Verified authentication context.
   * @param input Validated traveler creation payload.
   * @returns The created Prisma TravelerProfile.
   * @throws ConflictError When the authenticated account is already linked
   * to another traveler profile.
   */
  async create(
    auth: RequestAuth,
    input: CreateTravelerBody,
  ): Promise<TravelerProfile> {
    try {
      return await this.rlsUnitOfWork.execute(auth, (transaction) =>
        this.travelerRepository.create(
          transaction,
          createPersistenceInput(auth, input),
        ),
      );
    } catch (error) {
      if (error instanceof UniqueConstraintViolationError) {
        throw new ConflictError(
          "The authenticated account is already linked to a traveler",
        );
      }

      throw error;
    }
  }

  /**
   * Returns every traveler visible to the authenticated account through RLS.
   *
   * @param auth Verified authentication context.
   * @returns Prisma TravelerProfile objects visible to the current user.
   */
  findAll(auth: RequestAuth): Promise<TravelerProfile[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.travelerRepository.findAll(transaction),
    );
  }

  /**
   * Returns one traveler by id through the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param travelerId Traveler profile identifier.
   * @returns The matching Prisma TravelerProfile.
   * @throws NotFoundError When the traveler does not exist or is not visible.
   */
  findById(
    auth: RequestAuth,
    travelerId: string,
  ): Promise<TravelerProfile> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.travelerRepository.findById(
        transaction,
        travelerId,
      );

      if (traveler === null) {
        throw new NotFoundError("Traveler");
      }

      return traveler;
    });
  }

  /**
   * Updates the supplied fields of an existing traveler.
   *
   * Date/time values are converted to their persistence representation before
   * the repository is called. Unspecified properties remain unchanged.
   *
   * @param auth Verified authentication context.
   * @param travelerId Traveler profile identifier.
   * @param input Validated partial update payload.
   * @returns The updated Prisma TravelerProfile.
   * @throws NotFoundError When the traveler does not exist or is not visible.
   */
  update(
    auth: RequestAuth,
    travelerId: string,
    input: UpdateTravelerBody,
  ): Promise<TravelerProfile> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.travelerRepository.update(
        transaction,
        travelerId,
        updatePersistenceInput(input),
      );

      if (traveler === null) {
        throw new NotFoundError("Traveler");
      }

      return traveler;
    });
  }

  /**
   * Deletes a traveler profile through the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param travelerId Traveler profile identifier.
   * @throws NotFoundError When no traveler could be deleted.
   */
  delete(auth: RequestAuth, travelerId: string): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const deleted = await this.travelerRepository.delete(
        transaction,
        travelerId,
      );

      if (!deleted) {
        throw new NotFoundError("Traveler");
      }
    });
  }
}