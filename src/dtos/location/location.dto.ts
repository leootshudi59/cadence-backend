import { z } from "zod";
import { iataCodeSchema, localDateTimeSchema } from "../common";

export const locationLocatorSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("iata"),
    iataCode: iataCodeSchema,
  }),
  z.strictObject({
    source: z.literal("coordinates"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
]);

export const localLocationTimeSchema = z.strictObject({
  local: localDateTimeSchema,
  location: locationLocatorSchema,
});

export type LocationLocator = z.infer<typeof locationLocatorSchema>;
export type LocalLocationTime = z.infer<typeof localLocationTimeSchema>;
