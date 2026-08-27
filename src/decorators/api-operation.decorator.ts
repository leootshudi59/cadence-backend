import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BEARER_AUTH_SCHEME } from "../constants/auth.constants";
import { ErrorResponseDto } from "../dtos/common";

interface ProtectedOperationMetadata {
  operationId: string;
  summary: string;
}

export function ApiProtectedOperation(
  metadata: ProtectedOperationMetadata,
): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth(BEARER_AUTH_SCHEME),
    ApiOperation(metadata),
    ApiResponse({ status: 400, type: ErrorResponseDto }),
    ApiResponse({ status: 401, type: ErrorResponseDto }),
    ApiResponse({ status: 404, type: ErrorResponseDto }),
    ApiResponse({ status: 409, type: ErrorResponseDto }),
    ApiResponse({ status: 422, type: ErrorResponseDto }),
  );
}
