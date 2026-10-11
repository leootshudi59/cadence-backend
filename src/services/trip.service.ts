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
import type { Trip } from "../generated/prisma/client";
import type {
  ITripRepository,
  TripPersistenceInput,
  TripUpdatePersistenceInput,
} from "../repositories/interfaces/ITripRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { RlsTransactionClient } from "../repositories/types";
import { LocationService } from "./location.service";

/**
 * Validates that a trip date range is chronologically valid.
 *
 * @param startDate Trip start date in date-only ISO format.
 * @param endDate Trip end date in date-only ISO format.
 * @throws InvalidTripDateRangeError When endDate is before startDate.
 */
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

  /**
   * Creates a trip for the currently authenticated account.
   *
   * The destination is resolved through LocationService before persistence
   * so the canonical city, country, IANA timezone and Place id can be stored.
   *
   * API date values are converted to their database representation before
   * being passed to the repository.
   *
   * @param auth Verified authentication context.
   * @param input Validated trip creation payload.
   * @returns The created Prisma Trip.
   */
  create(auth: RequestAuth, input: CreateTripBody): Promise<Trip> {
    validateTripDates(input.startDate, input.endDate);

    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const destination = await this.locationService.resolve(
        transaction,
        input.destination,
      );

      const persistenceInput: TripPersistenceInput = {
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

      return this.tripRepository.create(
        transaction,
        persistenceInput,
      );
    });
  }

  /**
   * Returns every trip visible to the authenticated account through RLS.
   *
   * @param auth Verified authentication context.
   * @returns Prisma Trip objects visible to the current user.
   */
  findAll(auth: RequestAuth): Promise<Trip[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.tripRepository.findAll(transaction),
    );
  }

  /**
   * Returns one trip by id through the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @returns The matching Prisma Trip.
   * @throws NotFoundError When the trip does not exist or is not visible.
   */
  findById(auth: RequestAuth, tripId: string): Promise<Trip> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.findByIdInTransaction(transaction, tripId),
    );
  }

  /**
   * Updates the supplied fields of an existing trip.
   *
   * The resulting date range and budget pair are validated before
   * persistence. When the destination changes, LocationService resolves
   * its canonical geographic information again.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @param input Validated partial trip update payload.
   * @returns The updated Prisma Trip.
   * @throws NotFoundError When the trip does not exist or is not visible.
   * @throws InvalidTripDateRangeError When the resulting date range is invalid.
   * @throws InvalidInputError When only one budget field is present.
   */
  update(
    auth: RequestAuth,
    tripId: string,
    input: UpdateTripBody,
  ): Promise<Trip> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const existing = await this.findByIdInTransaction(
        transaction,
        tripId,
      );

      const startDate =
        input.startDate ?? storedDateToDateOnly(existing.startDate);

      const endDate =
        input.endDate ?? storedDateToDateOnly(existing.endDate);

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

      const persistenceInput: TripUpdatePersistenceInput = {};

      if (input.title !== undefined) {
        persistenceInput.title = input.title;
      }

      if (input.startDate !== undefined) {
        persistenceInput.startDate = dateOnlyToStoredDate(input.startDate);
      }

      if (input.endDate !== undefined) {
        persistenceInput.endDate = dateOnlyToStoredDate(input.endDate);
      }

      if (input.status !== undefined) {
        persistenceInput.status = input.status;
      }

      if (input.budgetAmount !== undefined) {
        persistenceInput.budgetAmount = input.budgetAmount;
      }

      if (input.budgetCurrency !== undefined) {
        persistenceInput.budgetCurrency = input.budgetCurrency;
      }

      if (input.baseCurrency !== undefined) {
        persistenceInput.baseCurrency = input.baseCurrency;
      }

      if (input.coverImageUrl !== undefined) {
        persistenceInput.coverImageUrl = input.coverImageUrl;
      }

      if (input.destination !== undefined) {
        const destination = await this.locationService.resolve(
          transaction,
          input.destination,
        );

        persistenceInput.destinationCity = destination.city;
        persistenceInput.destinationCountry = destination.country;
        persistenceInput.placeId = destination.placeId;
        persistenceInput.ianaZone = destination.ianaZone;
      }

      const trip = await this.tripRepository.update(
        transaction,
        tripId,
        persistenceInput,
      );

      if (trip === null) {
        throw new NotFoundError("Trip");
      }

      return trip;
    });
  }

  /**
   * Deletes a trip through the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @throws NotFoundError When no trip could be deleted.
   */
  delete(auth: RequestAuth, tripId: string): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const deleted = await this.tripRepository.delete(
        transaction,
        tripId,
      );

      if (!deleted) {
        throw new NotFoundError("Trip");
      }
    });
  }

  /**
   * Finds a trip inside an existing RLS transaction.
   *
   * This helper avoids opening a second transaction when another service
   * operation already executes inside RlsUnitOfWork.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param tripId Trip identifier.
   * @returns The matching Prisma Trip.
   * @throws NotFoundError When the trip does not exist or is not visible.
   */
  private async findByIdInTransaction(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<Trip> {
    const trip = await this.tripRepository.findById(
      transaction,
      tripId,
    );

    if (trip === null) {
      throw new NotFoundError("Trip");
    }

    return trip;
  }
}