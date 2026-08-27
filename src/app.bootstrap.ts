import type { LogLevel } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";
import { BEARER_AUTH_SCHEME } from "./constants/auth.constants";
import { OpenApiDocumentService } from "./openapi/openapi-document.service";

export async function configureApplication(
  app: NestExpressApplication,
): Promise<void> {
  app.enableCors();
  app.enableShutdownHooks();
  await app.init();

  const swaggerConfiguration = new DocumentBuilder()
    .setTitle("Cadence API")
    .setVersion("0.0.0")
    .setOpenAPIVersion("3.0.3")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      BEARER_AUTH_SCHEME,
    )
    .build();
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfiguration),
    { version: "3.0" },
  );
  app.get(OpenApiDocumentService).set(document);
}

export async function createApplication(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configuration = app.get(ConfigService);
  app.useLogger(
    configuration.getOrThrow<readonly LogLevel[]>(
      "app.logLevels",
    ) as LogLevel[],
  );
  await configureApplication(app);
  return app;
}
