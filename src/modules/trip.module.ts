import { Module } from "@nestjs/common";
import { ParticipantController } from "../controllers/participant.controller";
import { TripController } from "../controllers/trip.controller";
import { LocationService } from "../services/location.service";
import { ParticipantService } from "../services/participant.service";
import { TripService } from "../services/trip.service";

@Module({
  controllers: [TripController, ParticipantController],
  providers: [TripService, ParticipantService, LocationService],
})
export class TripModule {}
