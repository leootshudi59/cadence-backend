import { Module } from "@nestjs/common";
import { BookingTravelerController } from "../controllers/booking-traveler.controller";
import { BookingController } from "../controllers/booking.controller";
import { BookingTravelerService } from "../services/booking-traveler.service";
import { BookingService } from "../services/booking.service";
import { LocationService } from "../services/location.service";

@Module({
  controllers: [BookingController, BookingTravelerController],
  providers: [BookingService, BookingTravelerService, LocationService],
})
export class BookingModule {}
