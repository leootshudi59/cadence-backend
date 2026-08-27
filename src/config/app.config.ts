import { registerAs } from "@nestjs/config";
import type { LogLevel } from "@nestjs/common";

const NEST_LOG_LEVELS = [
  "debug",
  "error",
  "fatal",
  "log",
  "verbose",
  "warn",
] as const satisfies readonly LogLevel[];

export interface AppConfiguration {
  readonly host: string;
  readonly logLevels: readonly LogLevel[];
  readonly port: number;
}

function configuredLogLevels(value: string | undefined): readonly LogLevel[] {
  const configured = (value ?? "error,warn,log")
    .split(",")
    .map((level) => level.trim())
    .filter((level): level is LogLevel =>
      NEST_LOG_LEVELS.includes(level as LogLevel),
    );

  return configured.length > 0 ? configured : ["error", "warn", "log"];
}

export const appConfig = registerAs("app", (): AppConfiguration => ({
  host: "0.0.0.0",
  logLevels: configuredLogLevels(process.env["LOG_LEVEL"]),
  port: Number(process.env["PORT"] ?? 3001),
}));
