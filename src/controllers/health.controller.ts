import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ZodResponse } from "nestjs-zod";
import { Public } from "../decorators/public.decorator";
import { now } from "../domain";
import { HealthResponseDto, type HealthResponse } from "../dtos/common";

@Controller()
export class HealthController {
  @Get("health")
  @Public()
  @ZodResponse({ type: HealthResponseDto, status: HttpStatus.OK })
  getHealth(): HealthResponse {
    const at = now("utc").toISO();
    if (at === null) {
      throw new Error("Failed to format the current instant as an ISO string");
    }
    return { ok: true, at };
  }
}
