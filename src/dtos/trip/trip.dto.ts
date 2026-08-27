import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  countryCodeSchema,
  currencyCodeSchema,
  dateOnlySchema,
  deleteResponseSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "../common";
import { locationLocatorSchema } from "../location";

export const tripStatusSchema = z.enum([
  "draft",
  "planned",
  "ongoing",
  "past",
  "cancelled",
]);

const tripBudgetFields = {
  budgetAmount: z
    .string()
    .regex(/^\d{1,12}(?:\.\d{1,2})?$/)
    .nullable()
    .optional(),
  budgetCurrency: currencyCodeSchema.nullable().optional(),
};

function budgetIsPaired(input: {
  budgetAmount?: string | null;
  budgetCurrency?: string | null;
}): boolean {
  return (input.budgetAmount === null) === (input.budgetCurrency === null);
}

export const createTripBodySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    destination: locationLocatorSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    status: tripStatusSchema.default("planned"),
    ...tripBudgetFields,
    baseCurrency: currencyCodeSchema.default("EUR"),
    coverImageUrl: z.url().nullable().optional(),
  })
  .transform((input) => ({
    ...input,
    budgetAmount: input.budgetAmount ?? null,
    budgetCurrency: input.budgetCurrency ?? null,
  }))
  .refine(budgetIsPaired, {
    message: "budgetAmount and budgetCurrency must both be present or null",
  });

export const createTripResponseSchema = z.strictObject({
  id: uuidSchema,
  ownerId: uuidSchema,
  title: z.string(),
  destinationCity: z.string(),
  destinationCountry: countryCodeSchema,
  placeId: uuidSchema.nullable(),
  ianaZone: z.string(),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  status: tripStatusSchema,
  budgetAmount: z.string().nullable(),
  budgetCurrency: currencyCodeSchema.nullable(),
  baseCurrency: currencyCodeSchema,
  coverImageUrl: z.string().nullable(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const listTripsResponseSchema = z.array(createTripResponseSchema);

export const getTripParamsSchema = z.strictObject({ tripId: uuidSchema });
export const getTripResponseSchema = createTripResponseSchema;

export const updateTripParamsSchema = getTripParamsSchema;
export const updateTripBodySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200).optional(),
    destination: locationLocatorSchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    status: tripStatusSchema.optional(),
    ...tripBudgetFields,
    baseCurrency: currencyCodeSchema.optional(),
    coverImageUrl: z.url().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
export const updateTripResponseSchema = createTripResponseSchema;

export const deleteTripParamsSchema = getTripParamsSchema;
export const deleteTripResponseSchema = deleteResponseSchema;

export class CreateTripDto extends createZodDto(createTripBodySchema) {}
export class CreateTripResponseDto extends createZodDto(
  createTripResponseSchema,
) {}
export class ListTripsResponseDto extends createZodDto(
  listTripsResponseSchema,
) {}
export class GetTripParamsDto extends createZodDto(getTripParamsSchema) {}
export class GetTripResponseDto extends createZodDto(getTripResponseSchema) {}
export class UpdateTripParamsDto extends createZodDto(updateTripParamsSchema) {}
export class UpdateTripDto extends createZodDto(updateTripBodySchema) {}
export class UpdateTripResponseDto extends createZodDto(
  updateTripResponseSchema,
) {}
export class DeleteTripParamsDto extends createZodDto(deleteTripParamsSchema) {}
export class DeleteTripResponseDto extends createZodDto(
  deleteTripResponseSchema,
) {}
export class TripResponseDto extends createZodDto(createTripResponseSchema) {}

export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
export type TripStatus = z.infer<typeof tripStatusSchema>;
export type TripResponse = z.infer<typeof createTripResponseSchema>;
export type DeleteTripResponse = z.infer<typeof deleteTripResponseSchema>;
