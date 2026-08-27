import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  deleteResponseSchema,
  localDateTimeSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "../common";
import { localLocationTimeSchema } from "../location";

const optionalTrimmedString = z.string().trim().min(1).optional();

const flightAirportEndpointInputSchema = z.strictObject({
  iataCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/),
  local: localDateTimeSchema,
  terminal: optionalTrimmedString,
  gate: optionalTrimmedString,
});

const flightAirportEndpointStoredSchema =
  flightAirportEndpointInputSchema.extend({
    airportName: z.string().trim().min(1),
    city: z.string().trim().min(1),
    ianaZone: z.string().trim().min(1),
  });

const flightBaggageAllowanceSchema = z.strictObject({
  cabin: optionalTrimmedString,
  checked: optionalTrimmedString,
});

const flightTravelerInputSchema = z.strictObject({
  travelerId: uuidSchema.nullable(),
  seat: optionalTrimmedString,
  baggage: flightBaggageAllowanceSchema.optional(),
  checkInStatus: z.enum(["not-checked-in", "checked-in"]).optional(),
});

const flightSegmentInputSchema = z.strictObject({
  airlineName: z.string().trim().min(1),
  carrierCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2,3}$/),
  flightNumber: z.string().trim().min(1),
  operatingCarrierName: optionalTrimmedString,
  operatingCarrierCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2,3}$/)
    .optional(),
  aircraftType: optionalTrimmedString,
  cabinClass: optionalTrimmedString,
  fareType: optionalTrimmedString,
  departure: flightAirportEndpointInputSchema,
  arrival: flightAirportEndpointInputSchema,
  checkInOpensLocal: localDateTimeSchema.optional(),
  travelers: z.array(flightTravelerInputSchema),
});

const flightSegmentStoredSchema = flightSegmentInputSchema.extend({
  departure: flightAirportEndpointStoredSchema,
  arrival: flightAirportEndpointStoredSchema,
});

const flightDetailsInputSchema = z.strictObject({
  type: z.literal("flight"),
  bookingReference: optionalTrimmedString,
  segments: z.array(flightSegmentInputSchema).min(1),
});

const flightDetailsStoredSchema = flightDetailsInputSchema.extend({
  segments: z.array(flightSegmentStoredSchema).min(1),
});

const trainDetailsSchema = z.strictObject({ type: z.literal("train") });
const lodgingDetailsSchema = z.strictObject({ type: z.literal("lodging") });
const activityDetailsSchema = z.strictObject({ type: z.literal("activity") });
const restaurantDetailsSchema = z.strictObject({
  type: z.literal("restaurant"),
});
const transportDetailsSchema = z.strictObject({
  type: z.literal("transport"),
});

export const bookingDetailsInputSchema = z.discriminatedUnion("type", [
  flightDetailsInputSchema,
  trainDetailsSchema,
  lodgingDetailsSchema,
  activityDetailsSchema,
  restaurantDetailsSchema,
  transportDetailsSchema,
]);

export const bookingDetailsStoredSchema = z.discriminatedUnion("type", [
  flightDetailsStoredSchema,
  trainDetailsSchema,
  lodgingDetailsSchema,
  activityDetailsSchema,
  restaurantDetailsSchema,
  transportDetailsSchema,
]);

export const bookingStatusSchema = z.enum([
  "confirmed",
  "pending",
  "cancelled",
]);
export const verificationStatusSchema = z.enum(["verified", "needs-review"]);

const bookingWritableFields = {
  title: z.string().trim().min(1).max(250),
  providerName: z.string().trim().min(1).max(200).nullable().optional(),
  confirmationNumber: z.string().trim().min(1).max(120).nullable().optional(),
  status: bookingStatusSchema.default("confirmed"),
  details: bookingDetailsInputSchema,
  schedule: z
    .strictObject({
      start: localLocationTimeSchema,
      end: localLocationTimeSchema.nullable().optional(),
    })
    .optional(),
  verificationStatus: verificationStatusSchema.default("verified"),
  extractionConfidence: z.number().min(0).max(1).nullable().optional(),
  rawIngestionId: uuidSchema.nullable().optional(),
};

function scheduleMatchesDetails(
  input: {
    details: z.infer<typeof bookingDetailsInputSchema>;
    schedule?: unknown;
  },
  context: z.RefinementCtx,
): void {
  if (input.details.type === "flight" && input.schedule !== undefined) {
    context.addIssue({
      code: "custom",
      message: "Flight schedules are derived from their segments",
      path: ["schedule"],
    });
  }
  if (input.details.type !== "flight" && input.schedule === undefined) {
    context.addIssue({
      code: "custom",
      message: "A resolved schedule is required for non-flight bookings",
      path: ["schedule"],
    });
  }
}

export const createBookingParamsSchema = z.strictObject({ tripId: uuidSchema });
export const createBookingBodySchema = z
  .strictObject(bookingWritableFields)
  .superRefine(scheduleMatchesDetails);

export const createBookingResponseSchema = z.strictObject({
  id: uuidSchema,
  tripId: uuidSchema,
  type: z.enum([
    "flight",
    "train",
    "lodging",
    "activity",
    "restaurant",
    "transport",
  ]),
  title: z.string(),
  providerName: z.string().nullable(),
  confirmationNumber: z.string().nullable(),
  status: bookingStatusSchema,
  startAt: utcDateTimeSchema,
  startIanaZone: z.string(),
  startPlaceId: uuidSchema.nullable(),
  endAt: utcDateTimeSchema.nullable(),
  endIanaZone: z.string().nullable(),
  endPlaceId: uuidSchema.nullable(),
  details: bookingDetailsStoredSchema.nullable(),
  verificationStatus: verificationStatusSchema,
  extractionConfidence: z.number().nullable(),
  rawIngestionId: uuidSchema.nullable(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const listBookingsParamsSchema = createBookingParamsSchema;
export const listBookingsResponseSchema = z.array(createBookingResponseSchema);

export const getBookingParamsSchema = z.strictObject({
  tripId: uuidSchema,
  bookingId: uuidSchema,
});
export const getBookingResponseSchema = createBookingResponseSchema;

export const updateBookingParamsSchema = getBookingParamsSchema;
export const updateBookingBodySchema = z
  .strictObject({
    title: bookingWritableFields.title.optional(),
    providerName: bookingWritableFields.providerName,
    confirmationNumber: bookingWritableFields.confirmationNumber,
    status: bookingStatusSchema.optional(),
    details: bookingDetailsInputSchema.optional(),
    schedule: bookingWritableFields.schedule,
    verificationStatus: verificationStatusSchema.optional(),
    extractionConfidence: bookingWritableFields.extractionConfidence,
    rawIngestionId: bookingWritableFields.rawIngestionId,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
export const updateBookingResponseSchema = createBookingResponseSchema;

export const deleteBookingParamsSchema = getBookingParamsSchema;
export const deleteBookingResponseSchema = deleteResponseSchema;

export class CreateBookingParamsDto extends createZodDto(
  createBookingParamsSchema,
) {}
export class CreateBookingDto extends createZodDto(createBookingBodySchema) {}
export class CreateBookingResponseDto extends createZodDto(
  createBookingResponseSchema,
) {}
export class ListBookingsParamsDto extends createZodDto(
  listBookingsParamsSchema,
) {}
export class ListBookingsResponseDto extends createZodDto(
  listBookingsResponseSchema,
) {}
export class GetBookingParamsDto extends createZodDto(getBookingParamsSchema) {}
export class GetBookingResponseDto extends createZodDto(
  getBookingResponseSchema,
) {}
export class UpdateBookingParamsDto extends createZodDto(
  updateBookingParamsSchema,
) {}
export class UpdateBookingDto extends createZodDto(updateBookingBodySchema) {}
export class UpdateBookingResponseDto extends createZodDto(
  updateBookingResponseSchema,
) {}
export class DeleteBookingParamsDto extends createZodDto(
  deleteBookingParamsSchema,
) {}
export class DeleteBookingResponseDto extends createZodDto(
  deleteBookingResponseSchema,
) {}
export class BookingResponseDto extends createZodDto(
  createBookingResponseSchema,
) {}

export type BookingDetailsInput = z.infer<typeof bookingDetailsInputSchema>;
export type BookingDetailsStored = z.infer<typeof bookingDetailsStoredSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
export type UpdateBookingBody = z.infer<typeof updateBookingBodySchema>;
export type BookingResponse = z.infer<typeof createBookingResponseSchema>;
export type DeleteBookingResponse = z.infer<typeof deleteBookingResponseSchema>;
