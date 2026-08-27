import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { currencyCodeSchema, utcDateTimeSchema, uuidSchema } from "../common";

export const putProfileBodySchema = z.strictObject({
  displayName: z.string().trim().min(1).max(120),
  avatarUrl: z.url().nullable().optional(),
  locale: z.string().trim().min(2).max(35).default("fr-FR"),
  homeIanaZone: z.string().trim().min(1).max(100).default("Europe/Paris"),
  baseCurrency: currencyCodeSchema.default("EUR"),
});

export const putProfileResponseSchema = z.strictObject({
  id: uuidSchema,
  email: z.email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  locale: z.string(),
  homeIanaZone: z.string(),
  baseCurrency: currencyCodeSchema,
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const getProfileResponseSchema = putProfileResponseSchema;

export class PutProfileDto extends createZodDto(putProfileBodySchema) {}
export class PutProfileResponseDto extends createZodDto(
  putProfileResponseSchema,
) {}
export class GetProfileResponseDto extends createZodDto(
  getProfileResponseSchema,
) {}
export class ProfileResponseDto extends createZodDto(
  putProfileResponseSchema,
) {}

export type PutProfileBody = z.infer<typeof putProfileBodySchema>;
export type ProfileResponse = z.infer<typeof putProfileResponseSchema>;
