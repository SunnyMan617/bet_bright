import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.js";
import type { SlipProvider } from "../server/betway.js";
import type { OperationRecord, OperationStore } from "../server/store.js";
import type { DecodedSlip } from "../shared/contracts.js";

const slip: DecodedSlip = {
  code: "BWTEST1",
  provider: "Betway Nigeria",
  fetchedAt: "2026-08-16T12:00:00.000Z",
  totalOdds: 2.5,
  activeSelections: 1,
  selections: [
    {
      eventId: 101,
      marketId: "1011",
      outcomeId: "10111",
      event: "Lagos FC vs Abuja FC",
      sport: "soccer",
      league: "Premier League",
      region: "Nigeria",
      isLive: false,
      market: "1X2",
      selection: "Home",
      odds: 2.5,
      isActive: true,
    },
  ],
};

function setup() {
  const provider: SlipProvider = {
    decode: vi.fn().mockResolvedValue(slip),
    encode: vi.fn().mockResolvedValue({
      code: slip.code,
      slip,
      verification: {
        matched: true,
        requestedCount: 1,
        decodedCount: 1,
        missing: [],
        unexpected: [],
      },
    }),
    convert: vi.fn(),
  };
  const records: OperationRecord[] = [];
  const store: OperationStore = {
    record: (record) => records.push(record),
    recent: () => records,
  };
  return { app: createApp({ provider, store }), provider, records };
}

describe("HTTP API", () => {
  it("decodes a validated booking code and records telemetry", async () => {
    const { app, provider, records } = setup();
    const response = await request(app)
      .post("/api/v1/slips/decode")
      .send({ code: "bwtest1" })
      .expect(200);

    expect(response.body.code).toBe("BWTEST1");
    expect(provider.decode).toHaveBeenCalledWith("bwtest1");
    expect(records[0]).toMatchObject({
      kind: "decode",
      status: "success",
      selectionCount: 1,
    });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("rejects malformed selection input before calling the provider", async () => {
    const { app, provider } = setup();
    const response = await request(app)
      .post("/api/v1/slips/encode")
      .send({ selections: [{ eventId: 0, marketId: "", outcomeId: "" }] })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(provider.encode).not.toHaveBeenCalled();
  });

  it("exposes a lightweight health endpoint", async () => {
    const { app } = setup();
    const response = await request(app).get("/healthz").expect(200);
    expect(response.body).toMatchObject({ ok: true, service: "betbridge" });
  });
});
