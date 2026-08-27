import { UniqueConstraintViolationError } from "../../domain/errors";
import { Prisma } from "../../generated/prisma";

export function rethrowPersistenceError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new UniqueConstraintViolationError();
  }

  throw error;
}
