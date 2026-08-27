import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from "@nestjs/common";
import type { Request } from "express";
import type { RequestAuth } from "../auth/types";

interface RequestWithAuth extends Request {
  readonly auth?: RequestAuth;
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAuth => {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();

    if (request.auth === undefined) {
      throw new UnauthorizedException("Unauthorized");
    }

    return request.auth;
  },
);
