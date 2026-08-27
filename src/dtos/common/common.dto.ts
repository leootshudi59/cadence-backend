import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const uuidSchema = z.uuid();
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const iataCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const dateOnlySchema = z.iso.date();
export const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/);
export const timeOnlySchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/);
export const utcDateTimeSchema = z.iso.datetime({ offset: true });

export const errorResponseSchema = z.strictObject({
  error: z.string(),
});

export const deleteResponseSchema = z.strictObject({
  deleted: z.literal(true),
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  at: z.iso.datetime(),
});

export const openApiDocumentSchema = z.record(z.string(), z.unknown());

export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}
export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
export class OpenApiDocumentResponseDto extends createZodDto(
  openApiDocumentSchema,
) {}

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type OpenApiDocumentResponse = z.infer<typeof openApiDocumentSchema>;
