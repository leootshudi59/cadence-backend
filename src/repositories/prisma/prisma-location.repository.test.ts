import { describe, expect, it, vi } from "vitest";
import type { RlsTransactionClient } from "../types";
import { PrismaLocationRepository } from "./prisma-location.repository";

describe("PrismaLocationRepository", () => {
  it("queries canonical airport Places by IATA code", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const transaction = {
      place: { findFirst },
    } as unknown as RlsTransactionClient;

    await new PrismaLocationRepository().findByIataCode(transaction, "NRT");

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { category: "AIRPORT", iataCode: "NRT" },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("preserves exact coordinate lookup through Places", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const transaction = {
      place: { findFirst },
    } as unknown as RlsTransactionClient;

    await new PrismaLocationRepository().findByCoordinates(
      transaction,
      35.76858,
      140.388714,
    );

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { lat: 35.76858, lng: 140.388714 },
      orderBy: { updatedAt: "desc" },
    });
  });
});
