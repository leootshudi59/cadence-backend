import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createApplication } from "./app.bootstrap";

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const configuration = app.get(ConfigService);
  const port = configuration.getOrThrow<number>("app.port");
  const host = configuration.getOrThrow<string>("app.host");
  await app.listen(port, host);
}

void bootstrap().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  Logger.error(
    `Cadence API failed to start (${errorName})`,
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
