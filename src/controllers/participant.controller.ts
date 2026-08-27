import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import type { RequestAuth } from "../auth/types";
import { ApiProtectedOperation } from "../decorators/api-operation.decorator";
import { CurrentAuth } from "../decorators/current-auth.decorator";
import {
  CreateParticipantDto,
  CreateParticipantParamsDto,
  CreateParticipantResponseDto,
  DeleteParticipantParamsDto,
  DeleteParticipantResponseDto,
  GetParticipantParamsDto,
  GetParticipantResponseDto,
  ListParticipantsParamsDto,
  ListParticipantsResponseDto,
  UpdateParticipantDto,
  UpdateParticipantParamsDto,
  UpdateParticipantResponseDto,
  type DeleteParticipantResponse,
  type ParticipantResponse,
} from "../dtos/participant";
import { participantResponse } from "../mappers/api-response.mapper";
import { ParticipantService } from "../services/participant.service";

@ApiTags("participants")
@Controller("trips/:tripId/participants")
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Post()
  @ApiProtectedOperation({
    operationId: "createTripParticipant",
    summary: "Add a traveler to an owned trip",
  })
  @ZodResponse({
    type: CreateParticipantResponseDto,
    status: HttpStatus.CREATED,
  })
  async create(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: CreateParticipantParamsDto,
    @Body() input: CreateParticipantDto,
  ): Promise<ParticipantResponse> {
    return participantResponse(
      await this.participantService.create(auth, params.tripId, input),
    );
  }

  @Get()
  @ApiProtectedOperation({
    operationId: "listTripParticipants",
    summary: "List visible trip participants",
  })
  @ZodResponse({ type: ListParticipantsResponseDto, status: HttpStatus.OK })
  async findAll(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: ListParticipantsParamsDto,
  ): Promise<ParticipantResponse[]> {
    const records = await this.participantService.findAll(auth, params.tripId);
    return records.map(participantResponse);
  }

  @Get(":participantId")
  @ApiProtectedOperation({
    operationId: "getTripParticipant",
    summary: "Get a visible trip participant",
  })
  @ZodResponse({ type: GetParticipantResponseDto, status: HttpStatus.OK })
  async findById(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: GetParticipantParamsDto,
  ): Promise<ParticipantResponse> {
    return participantResponse(
      await this.participantService.findById(
        auth,
        params.tripId,
        params.participantId,
      ),
    );
  }

  @Patch(":participantId")
  @ApiProtectedOperation({
    operationId: "updateTripParticipant",
    summary: "Update a participant on an owned trip",
  })
  @ZodResponse({ type: UpdateParticipantResponseDto, status: HttpStatus.OK })
  async update(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: UpdateParticipantParamsDto,
    @Body() input: UpdateParticipantDto,
  ): Promise<ParticipantResponse> {
    return participantResponse(
      await this.participantService.update(
        auth,
        params.tripId,
        params.participantId,
        input,
      ),
    );
  }

  @Delete(":participantId")
  @ApiProtectedOperation({
    operationId: "deleteTripParticipant",
    summary: "Remove a participant from an owned trip",
  })
  @ZodResponse({ type: DeleteParticipantResponseDto, status: HttpStatus.OK })
  async delete(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: DeleteParticipantParamsDto,
  ): Promise<DeleteParticipantResponse> {
    await this.participantService.delete(
      auth,
      params.tripId,
      params.participantId,
    );
    return { deleted: true };
  }
}
