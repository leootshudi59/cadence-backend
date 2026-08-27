import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { deleteResponseSchema, uuidSchema } from "../common";

const nullableBookingTravelerFields = {
  seat: z.string().trim().min(1).max(30).nullable().optional(),
  ticketNumber: z.string().trim().min(1).max(120).nullable().optional(),
};

export const createBookingTravelerParamsSchema = z.strictObject({
  bookingId: uuidSchema,
});
export const createBookingTravelerBodySchema = z.strictObject({
  travelerId: uuidSchema,
  ...nullableBookingTravelerFields,
});
export const createBookingTravelerResponseSchema = z.strictObject({
  id: uuidSchema,
  bookingId: uuidSchema,
  travelerId: uuidSchema,
  seat: z.string().nullable(),
  ticketNumber: z.string().nullable(),
});

export const listBookingTravelersParamsSchema =
  createBookingTravelerParamsSchema;
export const listBookingTravelersResponseSchema = z.array(
  createBookingTravelerResponseSchema,
);

export const getBookingTravelerParamsSchema = z.strictObject({
  bookingId: uuidSchema,
  bookingTravelerId: uuidSchema,
});
export const getBookingTravelerResponseSchema =
  createBookingTravelerResponseSchema;

export const updateBookingTravelerParamsSchema = getBookingTravelerParamsSchema;
export const updateBookingTravelerBodySchema = z
  .strictObject(nullableBookingTravelerFields)
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
export const updateBookingTravelerResponseSchema =
  createBookingTravelerResponseSchema;

export const deleteBookingTravelerParamsSchema = getBookingTravelerParamsSchema;
export const deleteBookingTravelerResponseSchema = deleteResponseSchema;

export class CreateBookingTravelerParamsDto extends createZodDto(
  createBookingTravelerParamsSchema,
) {}
export class CreateBookingTravelerDto extends createZodDto(
  createBookingTravelerBodySchema,
) {}
export class CreateBookingTravelerResponseDto extends createZodDto(
  createBookingTravelerResponseSchema,
) {}
export class ListBookingTravelersParamsDto extends createZodDto(
  listBookingTravelersParamsSchema,
) {}
export class ListBookingTravelersResponseDto extends createZodDto(
  listBookingTravelersResponseSchema,
) {}
export class GetBookingTravelerParamsDto extends createZodDto(
  getBookingTravelerParamsSchema,
) {}
export class GetBookingTravelerResponseDto extends createZodDto(
  getBookingTravelerResponseSchema,
) {}
export class UpdateBookingTravelerParamsDto extends createZodDto(
  updateBookingTravelerParamsSchema,
) {}
export class UpdateBookingTravelerDto extends createZodDto(
  updateBookingTravelerBodySchema,
) {}
export class UpdateBookingTravelerResponseDto extends createZodDto(
  updateBookingTravelerResponseSchema,
) {}
export class DeleteBookingTravelerParamsDto extends createZodDto(
  deleteBookingTravelerParamsSchema,
) {}
export class DeleteBookingTravelerResponseDto extends createZodDto(
  deleteBookingTravelerResponseSchema,
) {}
export class BookingTravelerResponseDto extends createZodDto(
  createBookingTravelerResponseSchema,
) {}

export type CreateBookingTravelerBody = z.infer<
  typeof createBookingTravelerBodySchema
>;
export type UpdateBookingTravelerBody = z.infer<
  typeof updateBookingTravelerBodySchema
>;
export type BookingTravelerResponse = z.infer<
  typeof createBookingTravelerResponseSchema
>;
export type DeleteBookingTravelerResponse = z.infer<
  typeof deleteBookingTravelerResponseSchema
>;
