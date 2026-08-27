import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { databaseConfig } from "./config/database.config";
import { validateEnvironment } from "./config/environment.schema";
import { HealthController } from "./controllers/health.controller";
import { OpenApiController } from "./controllers/openapi.controller";
import { ApiExceptionFilter } from "./filters/api-exception.filter";
import { SupabaseAuthGuard } from "./guards/supabase-auth.guard";
import { AuthModule } from "./modules/auth.module";
import { BookingModule } from "./modules/booking.module";
import { DatabaseModule } from "./modules/database.module";
import { ProfileModule } from "./modules/profile.module";
import { TravelerModule } from "./modules/traveler.module";
import { TripModule } from "./modules/trip.module";
import { OpenApiDocumentService } from "./openapi/openapi-document.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: false,
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    TravelerModule,
    TripModule,
    BookingModule,
  ],
  controllers: [HealthController, OpenApiController],
  providers: [
    OpenApiDocumentService,
    { provide: APP_GUARD, useExisting: SupabaseAuthGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
