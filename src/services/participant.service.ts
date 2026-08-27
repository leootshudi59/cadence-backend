import { Inject, Injectable } from "@nestjs/common";
import type { RequestAuth } from "../auth/types";
import { PARTICIPANT_REPOSITORY } from "../constants/repository-tokens.constants";
import {
  ConflictError,
  NotFoundError,
  UniqueConstraintViolationError,
} from "../domain/errors";
import { utcNowStoredDate } from "../domain/time";
import type {
  CreateParticipantBody,
  UpdateParticipantBody,
} from "../dtos/participant";
import type {
  IParticipantRepository,
  ParticipantUpdatePersistenceInput,
} from "../repositories/interfaces/IParticipantRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";
import type { ParticipantRecord } from "../repositories/types";

@Injectable()
export class ParticipantService {
  constructor(
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IParticipantRepository,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
  ) {}

  async create(
    auth: RequestAuth,
    tripId: string,
    input: CreateParticipantBody,
  ): Promise<ParticipantRecord> {
    const now = utcNowStoredDate();
    try {
      return await this.rlsUnitOfWork.execute(auth, (transaction) =>
        this.participantRepository.create(transaction, {
          ...input,
          tripId,
          invitedAt: now,
          respondedAt: input.inviteStatus === "pending" ? null : now,
        }),
      );
    } catch (error) {
      if (error instanceof UniqueConstraintViolationError) {
        throw new ConflictError("Traveler is already a trip participant");
      }
      throw error;
    }
  }

  findAll(auth: RequestAuth, tripId: string): Promise<ParticipantRecord[]> {
    return this.rlsUnitOfWork.execute(auth, (transaction) =>
      this.participantRepository.findAll(transaction, tripId),
    );
  }

  findById(
    auth: RequestAuth,
    tripId: string,
    participantId: string,
  ): Promise<ParticipantRecord> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const participant = await this.participantRepository.findById(
        transaction,
        tripId,
        participantId,
      );
      if (participant === null) throw new NotFoundError("Trip participant");
      return participant;
    });
  }

  update(
    auth: RequestAuth,
    tripId: string,
    participantId: string,
    input: UpdateParticipantBody,
  ): Promise<ParticipantRecord> {
    const record: ParticipantUpdatePersistenceInput = {};
    if (input.role !== undefined) record.role = input.role;
    if (input.inviteStatus !== undefined) {
      record.inviteStatus = input.inviteStatus;
    }
    if (input.canViewDocuments !== undefined) {
      record.canViewDocuments = input.canViewDocuments;
    }
    if (input.inviteStatus !== undefined) {
      record.respondedAt =
        input.inviteStatus === "pending" ? null : utcNowStoredDate();
    }

    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      const participant = await this.participantRepository.update(
        transaction,
        tripId,
        participantId,
        record,
      );
      if (participant === null) throw new NotFoundError("Trip participant");
      return participant;
    });
  }

  delete(
    auth: RequestAuth,
    tripId: string,
    participantId: string,
  ): Promise<void> {
    return this.rlsUnitOfWork.execute(auth, async (transaction) => {
      if (
        !(await this.participantRepository.delete(
          transaction,
          tripId,
          participantId,
        ))
      ) {
        throw new NotFoundError("Trip participant");
      }
    });
  }
}
