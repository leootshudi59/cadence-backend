import { Body, Controller, Get, HttpStatus, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import type { RequestAuth } from "../auth/types";
import { ApiProtectedOperation } from "../decorators/api-operation.decorator";
import { CurrentAuth } from "../decorators/current-auth.decorator";
import {
  GetProfileResponseDto,
  PutProfileDto,
  PutProfileResponseDto,
  type ProfileResponse,
} from "../dtos/profile";
import { profileResponse } from "../mappers/api-response.mapper";
import { ProfileService } from "../services/profile.service";

@ApiTags("profiles")
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiProtectedOperation({
    operationId: "getProfile",
    summary: "Get the authenticated account profile",
  })
  @ZodResponse({ type: GetProfileResponseDto, status: HttpStatus.OK })
  async get(@CurrentAuth() auth: RequestAuth): Promise<ProfileResponse> {
    return profileResponse(await this.profileService.findCurrent(auth));
  }

  @Put()
  @ApiProtectedOperation({
    operationId: "putProfile",
    summary: "Create or replace the authenticated account profile",
  })
  @ZodResponse({ type: PutProfileResponseDto, status: HttpStatus.OK })
  async put(
    @CurrentAuth() auth: RequestAuth,
    @Body() input: PutProfileDto,
  ): Promise<ProfileResponse> {
    return profileResponse(await this.profileService.putCurrent(auth, input));
  }
}
