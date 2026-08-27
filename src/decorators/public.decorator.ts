import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_ROUTE } from "../constants/auth.constants";

/** Marks the health handler as public. The guard additionally checks GET /health. */
export const Public = (): MethodDecorator => SetMetadata(IS_PUBLIC_ROUTE, true);
