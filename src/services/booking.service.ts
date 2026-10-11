import { Inject, Injectable } from "@nestjs/common";
import type { RequestAuth } from "../auth/types";
import {
  BOOKING_REPOSITORY,
  BOOKING_TRAVELER_REPOSITORY,
} from "../constants/repository-tokens.constants";
import {
  ConflictError,
  InvalidFlightScheduleError,
  InvalidInputError,
  NotFoundError,
  UniqueConstraintViolationError,
} from "../domain/errors";
import {
  compareStoredDates,
  localDateTimeToStoredDate,
  type StoredDate,
} from "../domain/time";
import {
  bookingDetailsStoredSchema,
  type BookingDetailsInput,
  type BookingDetailsStored,
  type CreateBookingBody,
  type UpdateBookingBody,
} from "../dtos/booking";
import type { LocalLocationTime } from "../dtos/location";
import type {
  BookingPersistenceInput,
  BookingUpdatePersistenceInput,
  IBookingRepository,
} from "../repositories/interfaces/IBookingRepository";
import type {
  IBookingTravelerRepository,
  NormalizedBookingTraveler,
} from "../repositories/interfaces/IBookingTravelerRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import { BookingType as PrismaBookingType } from "../generated/prisma";
import type { Booking } from "../generated/prisma/client";
import type { RlsTransactionClient } from "../repositories/types";
import { LocationService, type ResolvedLocation } from "./location.service";

interface PreparedBooking {
  details: BookingDetailsStored;
  endAt: StoredDate | null;
  endIanaZone: string | null;
  endPlaceId: string | null;
  startAt: StoredDate;
  startIanaZone: string;
  startPlaceId: string | null;
  travelers: NormalizedBookingTraveler[];
  type: BookingDetailsStored["type"];
}

interface PreparedSchedule {
  endAt: StoredDate | null;
  endIanaZone: string | null;
  endPlaceId: string | null;
  startAt: StoredDate;
  startIanaZone: string;
  startPlaceId: string | null;
}

/**
 * Adds an optional property to an object only when its value is defined.
 *
 * This is mainly used when building stored booking details so optional API
 * fields remain absent instead of being persisted with an undefined value.
 */
function optionalField<T>(value: T | undefined, key: string): object {
  return value === undefined ? {} : { [key]: value };
}

/**
 * Builds the unique list of travelers associated with a flight booking.
 *
 * A traveler may appear in several flight segments. When the same traveler
 * has the same seat across all segments, that seat is preserved. When seat
 * assignments differ between segments, the booking-level seat is set to null.
 */
function normalizedTravelers(
  details: Extract<BookingDetailsStored, { type: "flight" }>,
): NormalizedBookingTraveler[] {
  const seatsByTraveler = new Map<string, Set<string | null>>();

  for (const segment of details.segments) {
    for (const traveler of segment.travelers) {
      if (traveler.travelerId === null) continue;
      const seats = seatsByTraveler.get(traveler.travelerId) ?? new Set();
      seats.add(traveler.seat ?? null);
      seatsByTraveler.set(traveler.travelerId, seats);
    }
  }

  return [...seatsByTraveler.entries()].map(([travelerId, seats]) => ({
    travelerId,
    seat: seats.size === 1 ? ([...seats][0] ?? null) : null,
  }));
}

/**
 * Extracts the persistence fields produced while preparing a booking.
 *
 * Common booking metadata such as title, status or confirmation number is
 * intentionally excluded because those values come directly from the API
 * request rather than from schedule/location normalization.
 */
function persistenceFields(
  prepared: PreparedBooking,
): Omit<
  BookingPersistenceInput,
  | "tripId"
  | "title"
  | "providerName"
  | "confirmationNumber"
  | "status"
  | "verificationStatus"
  | "extractionConfidence"
  | "rawIngestionId"
> {
  return {
    details: prepared.details,
    type: prepared.type,
    startAt: prepared.startAt,
    startIanaZone: prepared.startIanaZone,
    startPlaceId: prepared.startPlaceId,
    endAt: prepared.endAt,
    endIanaZone: prepared.endIanaZone,
    endPlaceId: prepared.endPlaceId,
  };
}

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(BOOKING_TRAVELER_REPOSITORY)
    private readonly bookingTravelerRepository: IBookingTravelerRepository,
    private readonly locationService: LocationService,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) { }

  /**
   * Creates a booking inside the authenticated RLS transaction.
   *
   * Booking details and schedules are normalized before persistence. Flight
   * bookings derive their schedule from their segments, while other booking
   * types require an explicit schedule.
   *
   * Flight travelers are synchronized after the booking has been created.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip receiving the booking.
   * @param input Validated booking creation payload.
   * @returns The created Prisma Booking.
   * @throws InvalidInputError When booking data is inconsistent.
   * @throws ConflictError When a unique booking constraint is violated.
   */
  async create(
    auth: RequestAuth,
    tripId: string,
    input: CreateBookingBody,
  ): Promise<Booking> {
    try {
      return await this.rlsUnitOfWork.execute(auth, async (transaction) => {
        const prepared = await this.prepareNewBooking(
          transaction,
          input.details,
          input.schedule,
        );
        const detailsReference =
          prepared.details.type === "flight"
            ? prepared.details.bookingReference
            : undefined;

        if (
          input.confirmationNumber !== undefined &&
          input.confirmationNumber !== null &&
          detailsReference !== undefined &&
          input.confirmationNumber !== detailsReference
        ) {
          throw new InvalidInputError(
            "confirmationNumber and details.bookingReference must match",
          );
        }

        const booking = await this.bookingRepository.create(transaction, {
          tripId,
          title: input.title,
          providerName: input.providerName ?? null,
          confirmationNumber:
            input.confirmationNumber ?? detailsReference ?? null,
          status: input.status,
          ...persistenceFields(prepared),
          verificationStatus: input.verificationStatus,
          extractionConfidence: input.extractionConfidence ?? null,
          rawIngestionId: input.rawIngestionId ?? null,
        });

        await this.bookingTravelerRepository.syncForBooking(
          transaction,
          booking.id,
          prepared.travelers,
        );
        return booking;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationError) {
        throw new ConflictError(
          "This confirmation number already exists on the trip",
        );
      }
      throw error;
    }
  }

  /**
   * Returns all bookings belonging to a trip and visible through the
   * authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @returns Prisma Booking objects belonging to the trip.
   */
  findAll(auth: RequestAuth, tripId: string): Promise<Booking[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.bookingRepository.findAll(transaction, tripId),
    );
  }

  /**
   * Returns one booking belonging to a specific trip.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @param bookingId Booking identifier.
   * @returns The matching Prisma Booking.
   * @throws NotFoundError When the booking does not exist or is not visible.
   */
  findById(
    auth: RequestAuth,
    tripId: string,
    bookingId: string,
  ): Promise<Booking> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.findByIdInTransaction(transaction, tripId, bookingId),
    );
  }

  /**
   * Updates a booking inside the authenticated RLS transaction.
   *
   * Partial API input is converted into a BookingUpdatePersistenceInput.
   * Flight details trigger full flight schedule preparation, while non-flight
   * schedules are resolved through LocationService.
   *
   * Confirmation numbers are kept consistent with flight booking references,
   * and booking travelers are synchronized whenever flight details change.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @param bookingId Booking identifier.
   * @param input Validated partial booking update payload.
   * @returns The updated Prisma Booking.
   * @throws NotFoundError When the booking does not exist or is not visible.
   * @throws InvalidInputError When booking data is inconsistent.
   * @throws ConflictError When a unique booking constraint is violated.
   */
  async update(
    auth: RequestAuth,
    tripId: string,
    bookingId: string,
    input: UpdateBookingBody,
  ): Promise<Booking> {
    try {
      return await this.rlsUnitOfWork.execute(auth, async (transaction) => {
        const existing = await this.findByIdInTransaction(
          transaction,
          tripId,
          bookingId,
        );
        const record: BookingUpdatePersistenceInput = {};
        let travelers: NormalizedBookingTraveler[] | undefined;

        if (input.title !== undefined) record.title = input.title;
        if (input.providerName !== undefined) {
          record.providerName = input.providerName;
        }
        if (input.confirmationNumber !== undefined) {
          record.confirmationNumber = input.confirmationNumber;
        }
        if (input.status !== undefined) record.status = input.status;
        if (input.verificationStatus !== undefined) {
          record.verificationStatus = input.verificationStatus;
        }
        if (input.extractionConfidence !== undefined) {
          record.extractionConfidence = input.extractionConfidence;
        }
        if (input.rawIngestionId !== undefined) {
          record.rawIngestionId = input.rawIngestionId;
        }

        if (input.details?.type === "flight") {
          if (input.schedule !== undefined) {
            throw new InvalidInputError(
              "Flight schedules are derived from their segments",
            );
          }
          const prepared = await this.prepareFlight(transaction, input.details);
          Object.assign(record, persistenceFields(prepared));
          travelers = prepared.travelers;
        } else if (input.schedule !== undefined) {
          if (existing.type === PrismaBookingType.FLIGHT && input.details === undefined) {
            throw new InvalidInputError(
              "A flight schedule can only be changed through flight segments",
            );
          }
          Object.assign(
            record,
            await this.prepareSchedule(transaction, input.schedule),
          );
          if (input.details !== undefined) {
            const details = bookingDetailsStoredSchema.parse(input.details);
            record.details = details;
            record.type = details.type;
            travelers = [];
          }
        } else if (input.details !== undefined) {
          if (existing.type === PrismaBookingType.FLIGHT) {
            throw new InvalidInputError(
              "Changing a flight to a non-flight booking requires a new schedule",
            );
          }
          const details = bookingDetailsStoredSchema.parse(input.details);
          record.details = details;
          record.type = details.type;
          travelers = [];
        }

        const finalDetails = bookingDetailsStoredSchema.safeParse(
          record.details ?? existing.details,
        );
        const finalReference =
          finalDetails.success && finalDetails.data.type === "flight"
            ? finalDetails.data.bookingReference
            : undefined;
        const finalConfirmation =
          record.confirmationNumber === undefined
            ? existing.confirmationNumber
            : record.confirmationNumber;
        if (
          finalConfirmation !== null &&
          finalReference !== undefined &&
          finalConfirmation !== finalReference
        ) {
          throw new InvalidInputError(
            "confirmationNumber and details.bookingReference must match",
          );
        }

        const booking = await this.bookingRepository.update(
          transaction,
          tripId,
          bookingId,
          record,
        );
        if (booking === null) throw new NotFoundError("Booking");

        if (travelers !== undefined) {
          await this.bookingTravelerRepository.syncForBooking(
            transaction,
            bookingId,
            travelers,
          );
        }
        return booking;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationError) {
        throw new ConflictError(
          "This confirmation number already exists on the trip",
        );
      }
      throw error;
    }
  }

  /**
   * Deletes a booking from a trip through the authenticated RLS transaction.
   *
   * @param auth Verified authentication context.
   * @param tripId Trip identifier.
   * @param bookingId Booking identifier.
   * @throws NotFoundError When no matching booking could be deleted.
   */ 
  delete(auth: RequestAuth, tripId: string, bookingId: string): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      if (
        !(await this.bookingRepository.delete(transaction, tripId, bookingId))
      ) {
        throw new NotFoundError("Booking");
      }
    });
  }

  /**
   * Converts a local date-time into the stored UTC instant associated with
   * the resolved location's IANA timezone.
   *
   * @param local Local date-time received from the booking payload.
   * @param location Resolved geographic location containing the IANA timezone.
   * @returns Database-compatible UTC date.
   * @throws InvalidInputError When the local time cannot be resolved.
   */
  private resolvedInstant(
    local: string,
    location: ResolvedLocation,
  ): StoredDate {
    try {
      return localDateTimeToStoredDate({ local, ianaZone: location.ianaZone });
    } catch {
      throw new InvalidInputError(
        `Invalid local time "${local}" in "${location.ianaZone}"`,
      );
    }
  }

  /**
   * Normalizes and validates a flight booking before persistence.
   *
   * Airport locations are resolved from their IATA codes, local departure and
   * arrival times are converted into UTC instants, and segment chronology is
   * validated.
   *
   * The method also builds the stored flight details and derives the booking
   * start/end schedule and normalized traveler assignments.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param details Validated flight details received from the API.
   * @returns Fully prepared flight booking persistence data.
   * @throws InvalidFlightScheduleError When segments contain an invalid schedule.
   */
  private async prepareFlight(  
    transaction: RlsTransactionClient,
    details: Extract<BookingDetailsInput, { type: "flight" }>,
  ): Promise<PreparedBooking> {
    let previousArrival: StoredDate | null = null;
    let firstStart: PreparedSchedule | null = null;
    let lastArrivalLocation: ResolvedLocation | null = null;
    const storedSegments: Extract<
      BookingDetailsStored,
      { type: "flight" }
    >["segments"] = [];

    for (const segment of details.segments) {
      const departureLocation = await this.locationService.resolve(
        transaction,
        { source: "iata", iataCode: segment.departure.iataCode },
      );
      const arrivalLocation = await this.locationService.resolve(transaction, {
        source: "iata",
        iataCode: segment.arrival.iataCode,
      });
      const departureAt = this.resolvedInstant(
        segment.departure.local,
        departureLocation,
      );
      const arrivalAt = this.resolvedInstant(
        segment.arrival.local,
        arrivalLocation,
      );

      if (compareStoredDates(arrivalAt, departureAt) <= 0) {
        throw new InvalidFlightScheduleError(
          `Flight ${segment.carrierCode}${segment.flightNumber} must arrive after it departs`,
        );
      }
      if (
        previousArrival !== null &&
        compareStoredDates(departureAt, previousArrival) < 0
      ) {
        throw new InvalidFlightScheduleError(
          "Flight segments overlap or are out of order",
        );
      }
      if (segment.checkInOpensLocal !== undefined) {
        const checkInAt = this.resolvedInstant(
          segment.checkInOpensLocal,
          departureLocation,
        );
        if (compareStoredDates(checkInAt, departureAt) > 0) {
          throw new InvalidFlightScheduleError(
            "checkInOpensLocal must not be after the segment departure",
          );
        }
      }

      if (firstStart === null) {
        firstStart = {
          startAt: departureAt,
          startIanaZone: departureLocation.ianaZone,
          startPlaceId: departureLocation.placeId,
          endAt: arrivalAt,
          endIanaZone: arrivalLocation.ianaZone,
          endPlaceId: arrivalLocation.placeId,
        };
      }
      previousArrival = arrivalAt;
      lastArrivalLocation = arrivalLocation;

      storedSegments.push({
        airlineName: segment.airlineName,
        carrierCode: segment.carrierCode,
        flightNumber: segment.flightNumber,
        ...optionalField(segment.operatingCarrierName, "operatingCarrierName"),
        ...optionalField(segment.operatingCarrierCode, "operatingCarrierCode"),
        ...optionalField(segment.aircraftType, "aircraftType"),
        ...optionalField(segment.cabinClass, "cabinClass"),
        ...optionalField(segment.fareType, "fareType"),
        departure: {
          iataCode: segment.departure.iataCode,
          airportName: departureLocation.name,
          city: departureLocation.city,
          local: segment.departure.local,
          ianaZone: departureLocation.ianaZone,
          ...optionalField(segment.departure.terminal, "terminal"),
          ...optionalField(segment.departure.gate, "gate"),
        },
        arrival: {
          iataCode: segment.arrival.iataCode,
          airportName: arrivalLocation.name,
          city: arrivalLocation.city,
          local: segment.arrival.local,
          ianaZone: arrivalLocation.ianaZone,
          ...optionalField(segment.arrival.terminal, "terminal"),
          ...optionalField(segment.arrival.gate, "gate"),
        },
        ...optionalField(segment.checkInOpensLocal, "checkInOpensLocal"),
        travelers: segment.travelers.map((traveler) => ({
          travelerId: traveler.travelerId,
          ...optionalField(traveler.seat, "seat"),
          ...optionalField(traveler.baggage, "baggage"),
          ...optionalField(traveler.checkInStatus, "checkInStatus"),
        })),
      });
    }

    if (
      firstStart === null ||
      previousArrival === null ||
      lastArrivalLocation === null
    ) {
      throw new InvalidFlightScheduleError(
        "At least one flight segment is required",
      );
    }

    const detailsStored = bookingDetailsStoredSchema.parse({
      type: "flight",
      ...optionalField(details.bookingReference, "bookingReference"),
      segments: storedSegments,
    });
    if (detailsStored.type !== "flight") {
      throw new InvalidFlightScheduleError("Expected validated flight details");
    }

    return {
      details: detailsStored,
      type: "flight",
      startAt: firstStart.startAt,
      startIanaZone: firstStart.startIanaZone,
      startPlaceId: firstStart.startPlaceId,
      endAt: previousArrival,
      endIanaZone: lastArrivalLocation.ianaZone,
      endPlaceId: lastArrivalLocation.placeId,
      travelers: normalizedTravelers(detailsStored),
    };
  }

  /**
   * Resolves and validates the schedule of a non-flight booking.
   *
   * Start and optional end locations are resolved through LocationService,
   * then their local date-times are converted into stored UTC instants.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param schedule Booking start and optional end schedule.
   * @returns Prepared persistence schedule with resolved Place ids and zones.
   * @throws InvalidInputError When the end occurs before the start.
   */
  private async prepareSchedule(
    transaction: RlsTransactionClient,
    schedule: {
      start: LocalLocationTime;
      end?: LocalLocationTime | null | undefined;
    },
  ): Promise<PreparedSchedule> {
    const startLocation = await this.locationService.resolve(
      transaction,
      schedule.start.location,
    );
    const startAt = this.resolvedInstant(schedule.start.local, startLocation);

    if (schedule.end === undefined || schedule.end === null) {
      return {
        startAt,
        startIanaZone: startLocation.ianaZone,
        startPlaceId: startLocation.placeId,
        endAt: null,
        endIanaZone: null,
        endPlaceId: null,
      };
    }

    const endLocation = await this.locationService.resolve(
      transaction,
      schedule.end.location,
    );
    const endAt = this.resolvedInstant(schedule.end.local, endLocation);
    if (compareStoredDates(endAt, startAt) < 0) {
      throw new InvalidInputError("Booking end must not be before its start");
    }

    return {
      startAt,
      startIanaZone: startLocation.ianaZone,
      startPlaceId: startLocation.placeId,
      endAt,
      endIanaZone: endLocation.ianaZone,
      endPlaceId: endLocation.placeId,
    };
  }

  /**
   * Prepares booking-specific details and schedule information for creation.
   *
   * Flight bookings derive their schedule directly from flight segments.
   * Other booking types require an explicit schedule supplied by the API.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param details Booking details discriminated by booking type.
   * @param schedule Optional booking schedule supplied by the API.
   * @returns Prepared booking data ready for persistence.
   * @throws InvalidInputError When a non-flight booking has no schedule.
   */
  private async prepareNewBooking(
    transaction: RlsTransactionClient,
    details: BookingDetailsInput,
    schedule: CreateBookingBody["schedule"],
  ): Promise<PreparedBooking> {
    if (details.type === "flight") {
      return this.prepareFlight(transaction, details);
    }
    if (schedule === undefined) {
      throw new InvalidInputError(
        "A resolved schedule is required for non-flight bookings",
      );
    }
    const times = await this.prepareSchedule(transaction, schedule);
    const storedDetails = bookingDetailsStoredSchema.parse(details);
    return {
      ...times,
      details: storedDetails,
      type: storedDetails.type,
      travelers: [],
    };
  }

  /**
   * Finds a booking inside an already-open RLS transaction.
   *
   * This helper is used by other service methods to avoid opening a nested
   * RLS transaction when the booking must first be loaded and validated.
   *
   * @param transaction Current authenticated RLS transaction.
   * @param tripId Trip identifier.
   * @param bookingId Booking identifier.
   * @returns The matching Prisma Booking.
   * @throws NotFoundError When the booking does not exist or is not visible.
   */
  private async findByIdInTransaction(
    transaction: RlsTransactionClient,
    tripId: string,
    bookingId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findById(
      transaction,
      tripId,
      bookingId,
    );
    if (booking === null) throw new NotFoundError("Booking");
    return booking;
  }
}