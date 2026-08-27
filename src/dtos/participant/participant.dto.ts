import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { deleteResponseSchema, utcDateTimeSchema, uuidSchema } from "../common";

export const participantRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const inviteStatusSchema = z.enum(["pending", "accepted", "declined"]);

export const createParticipantParamsSchema = z.strictObject({
  tripId: uuidSchema,
});
export const createParticipantBodySchema = z.strictObject({
  travelerId: uuidSchema,
  role: participantRoleSchema.default("viewer"),
  inviteStatus: inviteStatusSchema.default("pending"),
  canViewDocuments: z.boolean().default(false),
});
export const createParticipantResponseSchema = z.strictObject({
  id: uuidSchema,
  tripId: uuidSchema,
  travelerId: uuidSchema,
  role: participantRoleSchema,
  inviteStatus: inviteStatusSchema,
  canViewDocuments: z.boolean(),
  invitedAt: utcDateTimeSchema,
  respondedAt: utcDateTimeSchema.nullable(),
});

export const listParticipantsParamsSchema = createParticipantParamsSchema;
export const listParticipantsResponseSchema = z.array(
  createParticipantResponseSchema,
);

export const getParticipantParamsSchema = z.strictObject({
  tripId: uuidSchema,
  participantId: uuidSchema,
});
export const getParticipantResponseSchema = createParticipantResponseSchema;

export const updateParticipantParamsSchema = getParticipantParamsSchema;
export const updateParticipantBodySchema = z
  .strictObject({
    role: participantRoleSchema.optional(),
    inviteStatus: inviteStatusSchema.optional(),
    canViewDocuments: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
export const updateParticipantResponseSchema = createParticipantResponseSchema;

export const deleteParticipantParamsSchema = getParticipantParamsSchema;
export const deleteParticipantResponseSchema = deleteResponseSchema;

export class CreateParticipantParamsDto extends createZodDto(
  createParticipantParamsSchema,
) {}
export class CreateParticipantDto extends createZodDto(
  createParticipantBodySchema,
) {}
export class CreateParticipantResponseDto extends createZodDto(
  createParticipantResponseSchema,
) {}
export class ListParticipantsParamsDto extends createZodDto(
  listParticipantsParamsSchema,
) {}
export class ListParticipantsResponseDto extends createZodDto(
  listParticipantsResponseSchema,
) {}
export class GetParticipantParamsDto extends createZodDto(
  getParticipantParamsSchema,
) {}
export class GetParticipantResponseDto extends createZodDto(
  getParticipantResponseSchema,
) {}
export class UpdateParticipantParamsDto extends createZodDto(
  updateParticipantParamsSchema,
) {}
export class UpdateParticipantDto extends createZodDto(
  updateParticipantBodySchema,
) {}
export class UpdateParticipantResponseDto extends createZodDto(
  updateParticipantResponseSchema,
) {}
export class DeleteParticipantParamsDto extends createZodDto(
  deleteParticipantParamsSchema,
) {}
export class DeleteParticipantResponseDto extends createZodDto(
  deleteParticipantResponseSchema,
) {}
export class ParticipantResponseDto extends createZodDto(
  createParticipantResponseSchema,
) {}

export type CreateParticipantBody = z.infer<typeof createParticipantBodySchema>;
export type UpdateParticipantBody = z.infer<typeof updateParticipantBodySchema>;
export type ParticipantResponse = z.infer<
  typeof createParticipantResponseSchema
>;
export type DeleteParticipantResponse = z.infer<
  typeof deleteParticipantResponseSchema
>;
