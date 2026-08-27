import { Module } from "@nestjs/common";
import { TravelerController } from "../controllers/traveler.controller";
import { TravelerService } from "../services/traveler.service";

@Module({
  controllers: [TravelerController],
  providers: [TravelerService],
})
export class TravelerModule {}
