import "reflect-metadata";
import { config as loadDotEnv } from "dotenv";

// Hosted suites decide whether to run before Nest's ConfigModule is created.
// Load local development variables quietly so those skip decisions stay honest.
loadDotEnv({ quiet: true });
