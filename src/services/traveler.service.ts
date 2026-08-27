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
import type {
  ITravelerRepository,
  TravelerPersistenceInput,
  TravelerUpdatePersistenceInput,
} from "../repositories/interfaces/ITravelerRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { TravelerRecord } from "../repositories/types";

function createRecord(
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

function updateRecord(
  input: UpdateTravelerBody,
): TravelerUpdatePersistenceInput {
  const record: TravelerUpdatePersistenceInput = {};

  if (input.firstName !== undefined) record.firstName = input.firstName;
  if (input.lastName !== undefined) record.lastName = input.lastName;
  if (input.nationality !== undefined) record.nationality = input.nationality;
  if (input.residenceCountry !== undefined) {
    record.residenceCountry = input.residenceCountry;
  }
  if (input.maxActivitiesPerDay !== undefined) {
    record.maxActivitiesPerDay = input.maxActivitiesPerDay;
  }
  if (input.breakMinutesPerDay !== undefined) {
    record.breakMinutesPerDay = input.breakMinutesPerDay;
  }
  if (input.napRequired !== undefined) record.napRequired = input.napRequired;
  if (input.prefersLocalOverTouristic !== undefined) {
    record.prefersLocalOverTouristic = input.prefersLocalOverTouristic;
  }
  if (input.notes !== undefined) record.notes = input.notes;
  if (input.birthDate !== undefined) {
    record.birthDate =
      input.birthDate === null ? null : dateOnlyToStoredDate(input.birthDate);
  }
  if (input.earliestWakeTime !== undefined) {
    record.earliestWakeTime =
      input.earliestWakeTime === null
        ? null
        : timeOnlyToStoredDate(input.earliestWakeTime);
  }
  if (input.latestEndTime !== undefined) {
    record.latestEndTime =
      input.latestEndTime === null
        ? null
        : timeOnlyToStoredDate(input.latestEndTime);
  }
  if (input.napWindowStart !== undefined) {
    record.napWindowStart =
      input.napWindowStart === null
        ? null
        : timeOnlyToStoredDate(input.napWindowStart);
  }
  if (input.napWindowEnd !== undefined) {
    record.napWindowEnd =
      input.napWindowEnd === null
        ? null
        : timeOnlyToStoredDate(input.napWindowEnd);
  }

  return record;
}

@Injectable()
export class TravelerService {
  constructor(
    @Inject(TRAVELER_REPOSITORY)
    private readonly travelerRepository: ITravelerRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  async create(
    auth: RequestAuth,
    input: CreateTravelerBody,
  ): Promise<TravelerRecord> {
    try {
      return await this.rlsUnitOfWork.execute(auth, (transaction) =>
        this.travelerRepository.create(transaction, createRecord(auth, input)),
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

  findAll(auth: RequestAuth): Promise<TravelerRecord[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.travelerRepository.findAll(transaction),
    );
  }

  findById(auth: RequestAuth, travelerId: string): Promise<TravelerRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.travelerRepository.findById(
        transaction,
        travelerId,
      );
      if (traveler === null) throw new NotFoundError("Traveler");
      return traveler;
    });
  }

  update(
    auth: RequestAuth,
    travelerId: string,
    input: UpdateTravelerBody,
  ): Promise<TravelerRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const traveler = await this.travelerRepository.update(
        transaction,
        travelerId,
        updateRecord(input),
      );
      if (traveler === null) throw new NotFoundError("Traveler");
      return traveler;
    });
  }

  delete(auth: RequestAuth, travelerId: string): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      if (!(await this.travelerRepository.delete(transaction, travelerId))) {
        throw new NotFoundError("Traveler");
      }
    });
  }
}
