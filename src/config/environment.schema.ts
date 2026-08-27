import { z } from "zod";

const logLevelSchema = z
  .string()
  .trim()
  .min(1)
  .default("error,warn,log")
  .refine(
    (value) =>
      value
        .split(",")
        .map((level) => level.trim())
        .every((level) =>
          ["debug", "error", "fatal", "log", "verbose", "warn"].includes(level),
        ),
    "must contain only Nest log levels",
  );

export const environmentSchema = z
  .object({
    DATABASE_URL: z.string().trim().min(1),
    DIRECT_URL: z.string().trim().min(1).optional(),
    LOG_LEVEL: logLevelSchema,
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    RLS_CLIENT_PASSWORD: z.string().min(1),
  })
  .passthrough();

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const problems = result.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");
    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  return result.data;
}
