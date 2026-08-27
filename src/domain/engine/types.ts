export type Violation = {
  ruleId: string;
  severity: "blocking" | "warning" | "info";
  message: string;
  affectedTravelers: string[];
  relatedBookingIds: string[];
  suggestion?: string;
};
