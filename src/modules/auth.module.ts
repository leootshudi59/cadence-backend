import { Module } from "@nestjs/common";
import { SupabaseJwtVerifier } from "../auth/supabase-jwt-verifier";
import { SupabaseAuthGuard } from "../guards/supabase-auth.guard";
import { DatabaseModule } from "./database.module";

@Module({
  imports: [DatabaseModule],
  providers: [SupabaseJwtVerifier, SupabaseAuthGuard],
  exports: [SupabaseJwtVerifier, SupabaseAuthGuard],
})
export class AuthModule {}
