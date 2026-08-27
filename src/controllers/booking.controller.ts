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
  CreateBookingDto,
  CreateBookingParamsDto,
  CreateBookingResponseDto,
  DeleteBookingParamsDto,
  DeleteBookingResponseDto,
  GetBookingParamsDto,
  GetBookingResponseDto,
  ListBookingsParamsDto,
  ListBookingsResponseDto,
  UpdateBookingDto,
  UpdateBookingParamsDto,
  UpdateBookingResponseDto,
  type BookingResponse,
  type DeleteBookingResponse,
} from "../dtos/booking";
import { bookingResponse } from "../mappers/api-response.mapper";
import { BookingService } from "../services/booking.service";

@ApiTags("bookings")
@Controller("trips/:tripId/bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiProtectedOperation({
    operationId: "createBooking",
    summary: "Create a validated booking with server-resolved time zones",
  })
  @ZodResponse({ type: CreateBookingResponseDto, status: HttpStatus.CREATED })
  async create(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: CreateBookingParamsDto,
    @Body() input: CreateBookingDto,
  ): Promise<BookingResponse> {
    return bookingResponse(
      await this.bookingService.create(auth, params.tripId, input),
    );
  }

  @Get()
  @ApiProtectedOperation({
    operationId: "listBookings",
    summary: "List bookings visible through the trip's RLS scope",
  })
  @ZodResponse({ type: ListBookingsResponseDto, status: HttpStatus.OK })
  async findAll(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: ListBookingsParamsDto,
  ): Promise<BookingResponse[]> {
    const records = await this.bookingService.findAll(auth, params.tripId);
    return records.map(bookingResponse);
  }

  @Get(":bookingId")
  @ApiProtectedOperation({
    operationId: "getBooking",
    summary: "Get a visible booking",
  })
  @ZodResponse({ type: GetBookingResponseDto, status: HttpStatus.OK })
  async findById(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: GetBookingParamsDto,
  ): Promise<BookingResponse> {
    return bookingResponse(
      await this.bookingService.findById(auth, params.tripId, params.bookingId),
    );
  }

  @Patch(":bookingId")
  @ApiProtectedOperation({
    operationId: "updateBooking",
    summary: "Update an editable booking",
  })
  @ZodResponse({ type: UpdateBookingResponseDto, status: HttpStatus.OK })
  async update(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: UpdateBookingParamsDto,
    @Body() input: UpdateBookingDto,
  ): Promise<BookingResponse> {
    return bookingResponse(
      await this.bookingService.update(
        auth,
        params.tripId,
        params.bookingId,
        input,
      ),
    );
  }

  @Delete(":bookingId")
  @ApiProtectedOperation({
    operationId: "deleteBooking",
    summary: "Delete an editable booking",
  })
  @ZodResponse({ type: DeleteBookingResponseDto, status: HttpStatus.OK })
  async delete(
    @CurrentAuth() auth: RequestAuth,
    @Param() params: DeleteBookingParamsDto,
  ): Promise<DeleteBookingResponse> {
    await this.bookingService.delete(auth, params.tripId, params.bookingId);
    return { deleted: true };
  }
}
