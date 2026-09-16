import { Injectable } from "@nestjs/common";
import {
  InviteStatus as PrismaInviteStatus,
  ParticipantRole as PrismaParticipantRole,
} from "../../generated/prisma";
import type { TripParticipant } from "../../generated/prisma/client";
import type {
  IParticipantRepository,
  ParticipantPersistenceInput,
  ParticipantUpdatePersistenceInput,
} from "../interfaces/IParticipantRepository";
import type {
  InviteStatusValue,
  ParticipantRoleValue,
  RlsTransactionClient,
} from "../types";
import { rethrowPersistenceError } from "./prisma-errors";

const PRISMA_PARTICIPANT_ROLE: Record<
  ParticipantRoleValue,
  PrismaParticipantRole
> = {
  owner: PrismaParticipantRole.OWNER,
  editor: PrismaParticipantRole.EDITOR,
  viewer: PrismaParticipantRole.VIEWER,
};

const PRISMA_INVITE_STATUS: Record<
  InviteStatusValue,
  PrismaInviteStatus
> = {
  pending: PrismaInviteStatus.PENDING,
  accepted: PrismaInviteStatus.ACCEPTED,
  declined: PrismaInviteStatus.DECLINED,
};

@Injectable()
export class PrismaParticipantRepository implements IParticipantRepository {
  async create(
    transaction: RlsTransactionClient,
    input: ParticipantPersistenceInput,
  ): Promise<TripParticipant> {
    try {
      return await transaction.tripParticipant.create({
        data: {
          tripId: input.tripId,
          travelerId: input.travelerId,
          role: PRISMA_PARTICIPANT_ROLE[input.role],
          inviteStatus: PRISMA_INVITE_STATUS[input.inviteStatus],
          canViewDocuments: input.canViewDocuments,
          invitedAt: input.invitedAt,
          respondedAt: input.respondedAt,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<TripParticipant[]> {
    return transaction.tripParticipant.findMany({
      where: { tripId },
      orderBy: { invitedAt: "asc" },
    });
  }

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<TripParticipant | null> {
    return transaction.tripParticipant.findFirst({
      where: {
        id: participantId,
        tripId,
      },
    });
  }

  async update(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
    input: ParticipantUpdatePersistenceInput,
  ): Promise<TripParticipant | null> {
    try {
      const updated = await transaction.tripParticipant.updateMany({
        where: {
          id: participantId,
          tripId,
        },
        data: {
          ...(input.role === undefined
            ? {}
            : {
                role: PRISMA_PARTICIPANT_ROLE[input.role],
              }),

          ...(input.inviteStatus === undefined
            ? {}
            : {
                inviteStatus:
                  PRISMA_INVITE_STATUS[input.inviteStatus],
              }),

          ...(input.canViewDocuments === undefined
            ? {}
            : {
                canViewDocuments: input.canViewDocuments,
              }),

          ...(input.respondedAt === undefined
            ? {}
            : {
                respondedAt: input.respondedAt,
              }),
        },
      });

      if (updated.count === 0) {
        return null;
      }

      return transaction.tripParticipant.findFirst({
        where: {
          id: participantId,
          tripId,
        },
      });
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  async delete(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<boolean> {
    const deleted = await transaction.tripParticipant.deleteMany({
      where: {
        id: participantId,
        tripId,
      },
    });

    return deleted.count > 0;
  }
}