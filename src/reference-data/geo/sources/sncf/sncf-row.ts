import { z } from "zod";

export const SNCF_REQUIRED_HEADERS = [
  "Nom_Gare",
  "Trigramme",
  "Segment(s) DRG",
  "Position géographique",
  "Code commune",
  "Code_UIC",
  "Id_Gare",
] as const;

export const sncfRowFieldsSchema = z.object({
  Nom_Gare: z.string(),
  Trigramme: z.string(),
  "Segment(s) DRG": z.string(),
  "Position géographique": z.string(),
  "Code commune": z.string(),
  Code_UIC: z.string(),
  Id_Gare: z.string(),
});

export interface SncfRow {
  readonly Nom_Gare: string;
  readonly Trigramme: string;
  readonly "Segment(s) DRG": string;
  readonly "Position géographique": string;
  readonly "Code commune": string;
  readonly Code_UIC: string;
  readonly Id_Gare: string;
  readonly rawData: Readonly<Record<string, string>>;
}

export class SncfDataQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SncfDataQualityError";
  }
}
