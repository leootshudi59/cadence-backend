import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { SupabaseJwtVerifier } from "../auth/supabase-jwt-verifier";
import type { RequestAuth } from "../auth/types";
import { IS_PUBLIC_ROUTE } from "../constants/auth.constants";
import { IDENTITY_REPOSITORY } from "../constants/repository-tokens.constants";
import type { IIdentityRepository } from "../repositories/interfaces/IIdentityRepository";
import { RlsUnitOfWork } from "../repositories/rls-unit-of-work";

interface AuthenticatedExpressRequest extends Request {
  auth?: RequestAuth;
}

function bearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) return null;
  return /^Bearer\s+(\S+)$/i.exec(authorization.trim())?.[1] ?? null;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerifier: SupabaseJwtVerifier,
    private readonly rlsUnitOfWork: RlsUnitOfWork,
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IIdentityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedExpressRequest>();
    const markedPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (
      markedPublic === true &&
      request.method === "GET" &&
      request.path === "/health"
    ) {
      return true;
    }

    const token = bearerToken(request.headers.authorization);
    if (token === null) throw new UnauthorizedException("Unauthorized");

    let claims: RequestAuth["claims"];
    try {
      claims = await this.jwtVerifier.verify(token);
    } catch {
      throw new UnauthorizedException("Unauthorized");
    }

    let travelerProfileId: string | null;
    try {
      travelerProfileId = await this.rlsUnitOfWork.executeWithVerifiedClaims(
        claims,
        (transaction) =>
          this.identityRepository.findCurrentTravelerProfileId(transaction),
      );
    } catch {
      this.logger.error(
        "Failed to initialize the authenticated database context",
      );
      throw new ServiceUnavailableException("Service unavailable");
    }

    request.auth = Object.freeze({
      userId: claims.sub,
      accountId: claims.sub,
      travelerProfileId,
      claims,
    });
    return true;
  }
}
