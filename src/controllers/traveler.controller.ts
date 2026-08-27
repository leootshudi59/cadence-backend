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
  CreateTravelerDto,
  CreateTravelerResponseDto,
  DeleteTravelerParamsDto,
  DeleteTravelerResponseDto,
  GetTravelerParamsDto,
  GetTravelerResponseDto,
  ListTravelersResponseDto,
  UpdateTravelerDto,
  UpdateTravelerParamsDto,
  UpdateTravelerResponseDto,
  type DeleteTravelerResponse,
  type TravelerResponse,
} from "../dtos/traveler";
import { travelerResponse } from "../mappers/api-response.mapper";
import { TravelerService } from "../services/traveler.service";

@ApiTags("travelers")
@Controller("travelers")
export class TravelerController {
  constructor(private readonly travelerService: TravelerService) {}

  @Post()
  @ApiProtectedOperation({
    operationId: "createTraveler",
    summary: "Create a traveler controlled by this account",
  })
  @ZodResponse({
    type: CreateTravelerResponseDto,
    status: HttpStatus.CREATED,
  })
  async create(
    @CurrentAuth() auth: RequestAuth,
    @Body() input: CreateTravelerDto,
  ): Promise<TravelerResponse> {
    return travelerResponse(await this.travelerService.create(auth, input));
  }

  @Get()
  @ApiProtectedOperation({
    operationId: "listTravelers",
    summary: "List travelers controlled by this account",
  })
  @ZodResponse({ type: ListTravelersResponseDto, status: HttpStatus.OK })
  async findAll(@CurrentAuth() auth: RequestAuth): Promise<TravelerResponse[]> {
    const records = await this.travelerService.findAll(auth);
    return records.map(travelerResponse);
  }

  @Get(":travelerId")
  @ApiProtectedOperation({
    operationId: "getTraveler",
    summary: "Get a controlled traveler",
  })
  @ZodResponse({ type: GetTravelerResponseDto, status: HttpStatus.OK })
  async findById(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: GetTravelerParamsDto,
  ): Promise<TravelerResponse> {
    return travelerResponse(
      await this.travelerService.findById(auth, params.travelerId),
    );
  }

  @Patch(":travelerId")
  @ApiProtectedOperation({
    operationId: "updateTraveler",
    summary: "Update a controlled traveler",
  })
  @ZodResponse({ type: UpdateTravelerResponseDto, status: HttpStatus.OK })
  async update(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: UpdateTravelerParamsDto,
    @Body() input: UpdateTravelerDto,
  ): Promise<TravelerResponse> {
    return travelerResponse(
      await this.travelerService.update(auth, params.travelerId, input),
    );
  }

  @Delete(":travelerId")
  @ApiProtectedOperation({
    operationId: "deleteTraveler",
    summary: "Delete a controlled traveler",
  })
  @ZodResponse({ type: DeleteTravelerResponseDto, status: HttpStatus.OK })
  async delete(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: DeleteTravelerParamsDto,
  ): Promise<DeleteTravelerResponse> {
    await this.travelerService.delete(auth, params.travelerId);
    return { deleted: true };
  }
}
