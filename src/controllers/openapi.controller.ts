import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { ApiProtectedOperation } from "../decorators/api-operation.decorator";
import {
  OpenApiDocumentResponseDto,
  type OpenApiDocumentResponse,
} from "../dtos/common";
import { OpenApiDocumentService } from "../openapi/openapi-document.service";

@ApiTags("meta")
@Controller()
export class OpenApiController {
  constructor(
    private readonly openApiDocumentService: OpenApiDocumentService,
  ) {}

  @Get("openapi.json")
  @ApiProtectedOperation({
    operationId: "getOpenApiDocument",
    summary: "Get the generated OpenAPI document",
  })
  @ZodResponse({ type: OpenApiDocumentResponseDto, status: HttpStatus.OK })
  getDocument(): OpenApiDocumentResponse {
    return this.openApiDocumentService.get() as unknown as OpenApiDocumentResponse;
  }
}
