import type { StoredDate } from "../../domain/time";
import type { TripParticipant } from "../../generated/prisma/client";
import type {
  InviteStatusValue,
  ParticipantRoleValue,
  RlsTransactionClient,
} from "../types";

export interface ParticipantPersistenceInput {
  canViewDocuments: boolean;
  inviteStatus: InviteStatusValue;
  invitedAt: StoredDate;
  respondedAt: StoredDate | null;
  role: ParticipantRoleValue;
  travelerId: string;
  tripId: string;
}

export interface ParticipantUpdatePersistenceInput {
  canViewDocuments?: boolean;
  inviteStatus?: InviteStatusValue;
  respondedAt?: StoredDate | null;
  role?: ParticipantRoleValue;
}

export interface IParticipantRepository {
  create(
    transaction: RlsTransactionClient,
    input: ParticipantPersistenceInput,
  ): Promise<TripParticipant>;

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<TripParticipant[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<TripParticipant | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
    input: ParticipantUpdatePersistenceInput,
  ): Promise<TripParticipant | null>;

  delete(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<boolean>;
}