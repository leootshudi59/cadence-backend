import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RLS_CLIENT_ROLE } from "../constants/roles.constants";
import { PrismaClient } from "../generated/prisma";

interface RuntimeRoleRow {
  current_user: string;
  rolbypassrls: boolean;
  rolsuper: boolean;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.getOrThrow<string>("database.rlsDatabaseUrl"),
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      await this.verifyRuntimeRole();
    } catch (error) {
      await this.$disconnect();
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async verifyRuntimeRole(): Promise<string> {
    const rows = await this.$queryRaw<RuntimeRoleRow[]>`
      SELECT current_user,
             rolsuper,
             rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `;
    const role = rows[0];

    if (
      role === undefined ||
      role.current_user !== RLS_CLIENT_ROLE ||
      role.rolsuper ||
      role.rolbypassrls
    ) {
      throw new Error(
        "Runtime database connection is not the non-privileged rls_client role",
      );
    }

    return role.current_user;
  }
}
