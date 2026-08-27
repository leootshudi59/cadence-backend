import { Inject, Injectable } from "@nestjs/common";
import type { RequestAuth } from "../auth/types";
import { TRIP_REPOSITORY } from "../constants/repository-tokens.constants";
import {
  InvalidInputError,
  InvalidTripDateRangeError,
  NotFoundError,
} from "../domain/errors";
import { dateOnlyToStoredDate, storedDateToDateOnly } from "../domain/time";
import type { CreateTripBody, UpdateTripBody } from "../dtos/trip";
import type {
  ITripRepository,
  TripPersistenceInput,
  TripUpdatePersistenceInput,
} from "../repositories/interfaces/ITripRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { RlsTransactionClient, TripRecord } from "../repositories/types";
import { LocationService } from "./location.service";

function validateTripDates(startDate: string, endDate: string): void {
  if (endDate < startDate) {
    throw new InvalidTripDateRangeError(
      "endDate must be on or after startDate",
    );
  }
}

@Injectable()
export class TripService {
  constructor(
    @Inject(TRIP_REPOSITORY)
    private readonly tripRepository: ITripRepository,
    private readonly locationService: LocationService,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  create(auth: RequestAuth, input: CreateTripBody): Promise<TripRecord> {
    validateTripDates(input.startDate, input.endDate);

    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const destination = await this.locationService.resolve(
        transaction,
        input.destination,
      );
      const record: TripPersistenceInput = {
        ownerId: auth.accountId,
        title: input.title,
        destinationCity: destination.city,
        destinationCountry: destination.country,
        placeId: destination.placeId,
        ianaZone: destination.ianaZone,
        startDate: dateOnlyToStoredDate(input.startDate),
        endDate: dateOnlyToStoredDate(input.endDate),
        status: input.status,
        budgetAmount: input.budgetAmount,
        budgetCurrency: input.budgetCurrency,
        baseCurrency: input.baseCurrency,
        coverImageUrl: input.coverImageUrl ?? null,
      };
      return this.tripRepository.create(transaction, record);
    });
  }

  findAll(auth: RequestAuth): Promise<TripRecord[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.tripRepository.findAll(transaction),
    );
  }

  findById(auth: RequestAuth, tripId: string): Promise<TripRecord> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.findByIdInTransaction(transaction, tripId),
    );
  }

  update(
    auth: RequestAuth,
    tripId: string,
    input: UpdateTripBody,
  ): Promise<TripRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const existing = await this.findByIdInTransaction(transaction, tripId);
      const startDate =
        input.startDate ?? storedDateToDateOnly(existing.startDate);
      const endDate = input.endDate ?? storedDateToDateOnly(existing.endDate);
      validateTripDates(startDate, endDate);

      const finalBudgetAmount =
        input.budgetAmount === undefined
          ? existing.budgetAmount
          : input.budgetAmount;
      const finalBudgetCurrency =
        input.budgetCurrency === undefined
          ? existing.budgetCurrency
          : input.budgetCurrency;
      if ((finalBudgetAmount === null) !== (finalBudgetCurrency === null)) {
        throw new InvalidInputError(
          "budgetAmount and budgetCurrency must both be present or null",
        );
      }

      const record: TripUpdatePersistenceInput = {};
      if (input.title !== undefined) record.title = input.title;
      if (input.startDate !== undefined) {
        record.startDate = dateOnlyToStoredDate(input.startDate);
      }
      if (input.endDate !== undefined) {
        record.endDate = dateOnlyToStoredDate(input.endDate);
      }
      if (input.status !== undefined) record.status = input.status;
      if (input.budgetAmount !== undefined) {
        record.budgetAmount = input.budgetAmount;
      }
      if (input.budgetCurrency !== undefined) {
        record.budgetCurrency = input.budgetCurrency;
      }
      if (input.baseCurrency !== undefined) {
        record.baseCurrency = input.baseCurrency;
      }
      if (input.coverImageUrl !== undefined) {
        record.coverImageUrl = input.coverImageUrl;
      }
      if (input.destination !== undefined) {
        const destination = await this.locationService.resolve(
          transaction,
          input.destination,
        );
        record.destinationCity = destination.city;
        record.destinationCountry = destination.country;
        record.placeId = destination.placeId;
        record.ianaZone = destination.ianaZone;
      }

      const trip = await this.tripRepository.update(
        transaction,
        tripId,
        record,
      );
      if (trip === null) throw new NotFoundError("Trip");
      return trip;
    });
  }

  delete(auth: RequestAuth, tripId: string): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      if (!(await this.tripRepository.delete(transaction, tripId))) {
        throw new NotFoundError("Trip");
      }
    });
  }

  private async findByIdInTransaction(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<TripRecord> {
    const trip = await this.tripRepository.findById(transaction, tripId);
    if (trip === null) throw new NotFoundError("Trip");
    return trip;
  }
}
