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
  CreateBookingTravelerDto,
  CreateBookingTravelerParamsDto,
  CreateBookingTravelerResponseDto,
  DeleteBookingTravelerParamsDto,
  DeleteBookingTravelerResponseDto,
  GetBookingTravelerParamsDto,
  GetBookingTravelerResponseDto,
  ListBookingTravelersParamsDto,
  ListBookingTravelersResponseDto,
  UpdateBookingTravelerDto,
  UpdateBookingTravelerParamsDto,
  UpdateBookingTravelerResponseDto,
  type BookingTravelerResponse,
  type DeleteBookingTravelerResponse,
} from "../dtos/booking-traveler";
import { bookingTravelerResponse } from "../mappers/api-response.mapper";
import { BookingTravelerService } from "../services/booking-traveler.service";

@ApiTags("booking travelers")
@Controller("bookings/:bookingId/travelers")
export class BookingTravelerController {
  constructor(
    private readonly bookingTravelerService: BookingTravelerService,
  ) {}

  @Post()
  @ApiProtectedOperation({
    operationId: "createBookingTraveler",
    summary: "Assign a trip participant to a booking",
  })
  @ZodResponse({
    type: CreateBookingTravelerResponseDto,
    status: HttpStatus.CREATED,
  })
  async create(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: CreateBookingTravelerParamsDto,
    @Body() input: CreateBookingTravelerDto,
  ): Promise<BookingTravelerResponse> {
    return bookingTravelerResponse(
      await this.bookingTravelerService.create(auth, params.bookingId, input),
    );
  }

  @Get()
  @ApiProtectedOperation({
    operationId: "listBookingTravelers",
    summary: "List travelers assigned to a visible booking",
  })
  @ZodResponse({
    type: ListBookingTravelersResponseDto,
    status: HttpStatus.OK,
  })
  async findAll(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: ListBookingTravelersParamsDto,
  ): Promise<BookingTravelerResponse[]> {
    const records = await this.bookingTravelerService.findAll(
      auth,
      params.bookingId,
    );
    return records.map(bookingTravelerResponse);
  }

  @Get(":bookingTravelerId")
  @ApiProtectedOperation({
    operationId: "getBookingTraveler",
    summary: "Get a traveler assignment on a visible booking",
  })
  @ZodResponse({ type: GetBookingTravelerResponseDto, status: HttpStatus.OK })
  async findById(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: GetBookingTravelerParamsDto,
  ): Promise<BookingTravelerResponse> {
    return bookingTravelerResponse(
      await this.bookingTravelerService.findById(
        auth,
        params.bookingId,
        params.bookingTravelerId,
      ),
    );
  }

  @Patch(":bookingTravelerId")
  @ApiProtectedOperation({
    operationId: "updateBookingTraveler",
    summary: "Update an editable booking traveler assignment",
  })
  @ZodResponse({
    type: UpdateBookingTravelerResponseDto,
    status: HttpStatus.OK,
  })
  async update(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: UpdateBookingTravelerParamsDto,
    @Body() input: UpdateBookingTravelerDto,
  ): Promise<BookingTravelerResponse> {
    return bookingTravelerResponse(
      await this.bookingTravelerService.update(
        auth,
        params.bookingId,
        params.bookingTravelerId,
        input,
      ),
    );
  }

  @Delete(":bookingTravelerId")
  @ApiProtectedOperation({
    operationId: "deleteBookingTraveler",
    summary: "Remove a traveler assignment from an editable booking",
  })
  @ZodResponse({
    type: DeleteBookingTravelerResponseDto,
    status: HttpStatus.OK,
  })
  async delete(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: DeleteBookingTravelerParamsDto,
  ): Promise<DeleteBookingTravelerResponse> {
    await this.bookingTravelerService.delete(
      auth,
      params.bookingId,
      params.bookingTravelerId,
    );
    return { deleted: true };
  }
}
