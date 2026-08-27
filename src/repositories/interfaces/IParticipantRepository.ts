import type { StoredDate } from "../../domain/time";
import type {
  InviteStatusValue,
  ParticipantRecord,
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
  ): Promise<ParticipantRecord>;

  findAll(
    transaction: RlsTransactionClient,
    tripId: string,
  ): Promise<ParticipantRecord[]>;

  findById(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<ParticipantRecord | null>;

  update(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
    input: ParticipantUpdatePersistenceInput,
  ): Promise<ParticipantRecord | null>;

  delete(
    transaction: RlsTransactionClient,
    tripId: string,
    participantId: string,
  ): Promise<boolean>;
}
