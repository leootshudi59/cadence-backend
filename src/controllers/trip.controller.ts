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
  CreateTripDto,
  CreateTripResponseDto,
  DeleteTripParamsDto,
  DeleteTripResponseDto,
  GetTripParamsDto,
  GetTripResponseDto,
  ListTripsResponseDto,
  UpdateTripDto,
  UpdateTripParamsDto,
  UpdateTripResponseDto,
  type DeleteTripResponse,
  type TripResponse,
} from "../dtos/trip";
import { tripResponse } from "../mappers/api-response.mapper";
import { TripService } from "../services/trip.service";

@ApiTags("trips")
@Controller("trips")
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @ApiProtectedOperation({
    operationId: "createTrip",
    summary: "Create a trip with a server-resolved destination time zone",
  })
  @ZodResponse({ type: CreateTripResponseDto, status: HttpStatus.CREATED })
  async create(
    @CurrentAuth() auth: RequestAuth,
    @Body() input: CreateTripDto,
  ): Promise<TripResponse> {
    return tripResponse(await this.tripService.create(auth, input));
  }

  @Get()
  @ApiProtectedOperation({
    operationId: "listTrips",
    summary: "List trips visible through RLS",
  })
  @ZodResponse({ type: ListTripsResponseDto, status: HttpStatus.OK })
  async findAll(@CurrentAuth() auth: RequestAuth): Promise<TripResponse[]> {
    const records = await this.tripService.findAll(auth);
    return records.map(tripResponse);
  }

  @Get(":tripId")
  @ApiProtectedOperation({
    operationId: "getTrip",
    summary: "Get a visible trip",
  })
  @ZodResponse({ type: GetTripResponseDto, status: HttpStatus.OK })
  async findById(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: GetTripParamsDto,
  ): Promise<TripResponse> {
    return tripResponse(await this.tripService.findById(auth, params.tripId));
  }

  @Patch(":tripId")
  @ApiProtectedOperation({
    operationId: "updateTrip",
    summary: "Update an editable trip",
  })
  @ZodResponse({ type: UpdateTripResponseDto, status: HttpStatus.OK })
  async update(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: UpdateTripParamsDto,
    @Body() input: UpdateTripDto,
  ): Promise<TripResponse> {
    return tripResponse(
      await this.tripService.update(auth, params.tripId, input),
    );
  }

  @Delete(":tripId")
  @ApiProtectedOperation({
    operationId: "deleteTrip",
    summary: "Delete an owned trip",
  })
  @ZodResponse({ type: DeleteTripResponseDto, status: HttpStatus.OK })
  async delete(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: DeleteTripParamsDto,
  ): Promise<DeleteTripResponse> {
    await this.tripService.delete(auth, params.tripId);
    return { deleted: true };
  }
}
