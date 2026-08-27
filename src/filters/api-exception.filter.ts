import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from "../domain/errors";

function httpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === "string") return response;
  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response
  ) {
    const message = response.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join("; ");
  }
  return exception.message;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      const errorName =
        exception instanceof Error ? exception.name : "UnknownError";
      this.logger.error(`Unhandled API failure (${errorName})`);
    }

    response.status(mapped.status).json({ error: mapped.error });
  }

  private map(exception: unknown): {
    status: number;
    error: string;
  } {
    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, error: exception.message };
    }
    if (exception instanceof ConflictError) {
      return { status: HttpStatus.CONFLICT, error: exception.message };
    }
    if (exception instanceof InvalidInputError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        error: exception.message,
      };
    }
    if (exception instanceof ZodError) {
      return { status: HttpStatus.BAD_REQUEST, error: exception.message };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 401) {
        return { status, error: "Unauthorized" };
      }
      if (status === 503) {
        return { status, error: "Service unavailable" };
      }
      if (status >= 500) {
        return { status, error: "Internal server error" };
      }
      return { status, error: httpExceptionMessage(exception) };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal server error",
    };
  }
}
