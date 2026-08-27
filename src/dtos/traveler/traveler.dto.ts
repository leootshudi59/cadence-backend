import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  countryCodeSchema,
  dateOnlySchema,
  deleteResponseSchema,
  timeOnlySchema,
  utcDateTimeSchema,
  uuidSchema,
} from "../common";

const travelerWritableFields = {
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  birthDate: dateOnlySchema.nullable().optional(),
  nationality: countryCodeSchema.nullable().optional(),
  residenceCountry: countryCodeSchema.nullable().optional(),
  earliestWakeTime: timeOnlySchema.nullable().optional(),
  latestEndTime: timeOnlySchema.nullable().optional(),
  maxActivitiesPerDay: z.int().min(0).max(24).nullable().optional(),
  breakMinutesPerDay: z.int().min(0).max(1440).nullable().optional(),
  napRequired: z.boolean().default(false),
  napWindowStart: timeOnlySchema.nullable().optional(),
  napWindowEnd: timeOnlySchema.nullable().optional(),
  prefersLocalOverTouristic: z.boolean().default(false),
  notes: z.string().trim().max(4000).nullable().optional(),
};

export const createTravelerBodySchema = z.strictObject({
  ...travelerWritableFields,
  linkToAuthenticatedAccount: z.boolean().default(false),
});

export const createTravelerResponseSchema = z.strictObject({
  id: uuidSchema,
  ownerId: uuidSchema,
  accountId: uuidSchema.nullable(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: dateOnlySchema.nullable(),
  nationality: countryCodeSchema.nullable(),
  residenceCountry: countryCodeSchema.nullable(),
  earliestWakeTime: timeOnlySchema.nullable(),
  latestEndTime: timeOnlySchema.nullable(),
  maxActivitiesPerDay: z.int().nullable(),
  breakMinutesPerDay: z.int().nullable(),
  napRequired: z.boolean(),
  napWindowStart: timeOnlySchema.nullable(),
  napWindowEnd: timeOnlySchema.nullable(),
  prefersLocalOverTouristic: z.boolean(),
  notes: z.string().nullable(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const listTravelersResponseSchema = z.array(
  createTravelerResponseSchema,
);

export const getTravelerParamsSchema = z.strictObject({
  travelerId: uuidSchema,
});

export const getTravelerResponseSchema = createTravelerResponseSchema;

export const updateTravelerParamsSchema = getTravelerParamsSchema;
export const updateTravelerBodySchema = z
  .strictObject({
    ...travelerWritableFields,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
export const updateTravelerResponseSchema = createTravelerResponseSchema;

export const deleteTravelerParamsSchema = getTravelerParamsSchema;
export const deleteTravelerResponseSchema = deleteResponseSchema;

export class CreateTravelerDto extends createZodDto(createTravelerBodySchema) {}
export class CreateTravelerResponseDto extends createZodDto(
  createTravelerResponseSchema,
) {}
export class ListTravelersResponseDto extends createZodDto(
  listTravelersResponseSchema,
) {}
export class GetTravelerParamsDto extends createZodDto(
  getTravelerParamsSchema,
) {}
export class GetTravelerResponseDto extends createZodDto(
  getTravelerResponseSchema,
) {}
export class UpdateTravelerParamsDto extends createZodDto(
  updateTravelerParamsSchema,
) {}
export class UpdateTravelerDto extends createZodDto(updateTravelerBodySchema) {}
export class UpdateTravelerResponseDto extends createZodDto(
  updateTravelerResponseSchema,
) {}
export class DeleteTravelerParamsDto extends createZodDto(
  deleteTravelerParamsSchema,
) {}
export class DeleteTravelerResponseDto extends createZodDto(
  deleteTravelerResponseSchema,
) {}
export class TravelerResponseDto extends createZodDto(
  createTravelerResponseSchema,
) {}

export type CreateTravelerBody = z.infer<typeof createTravelerBodySchema>;
export type UpdateTravelerBody = z.infer<typeof updateTravelerBodySchema>;
export type TravelerResponse = z.infer<typeof createTravelerResponseSchema>;
export type DeleteTravelerResponse = z.infer<
  typeof deleteTravelerResponseSchema
>;
