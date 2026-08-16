import { afterEach, describe, expect, it, vi } from "vitest";
import { BetwayClient } from "../server/betway.js";

const rawSelection = {
  outcomeId: "10111",
  marketId: "1011",
  eventId: 101,
  priceDecimal: 2.5,
  price: { outcomeId: "10111", priceDecimal: 2.5 },
  outcome: {
    outcomeId: "10111",
    marketId: "1011",
    eventId: 101,
    displayName: "Home",
    isTradingActive: true,
  },
  market: {
    marketId: "1011",
    eventId: 101,
    displayName: "1X2",
    isActive: true,
    isSuspended: false,
  },
  sportEvent: {
    eventId: 101,
    displayName: "Lagos FC vs Abuja FC",
    homeTeam: "Lagos FC",
    awayTeam: "Abuja FC",
    expectedStartEpoch: 1_800_000_000,
    sportId: "soccer",
    league: "Premier League",
    region: "Nigeria",
    isLive: false,
    isActive: true,
  },
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BetwayClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes a Betway slip without losing selection identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ selections: [rawSelection] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BetwayClient({ baseUrl: "https://operator.test" });

    const slip = await client.decode(" bwtest1 ");

    expect(slip.code).toBe("BWTEST1");
    expect(slip.totalOdds).toBe(2.5);
    expect(slip.activeSelections).toBe(1);
    expect(slip.selections[0]).toMatchObject({
      eventId: 101,
      marketId: "1011",
      outcomeId: "10111",
      event: "Lagos FC vs Abuja FC",
      market: "1X2",
      selection: "Home",
      odds: 2.5,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://operator.test/v2/Betting/FindBookABet",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates a code and proves the returned selection set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ bookingCode: "BWNEW123" }))
      .mockResolvedValueOnce(response({ selections: [rawSelection] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BetwayClient({ baseUrl: "https://operator.test" });

    const encoded = await client.encode([
      { eventId: 101, marketId: "1011", outcomeId: "10111" },
    ]);

    expect(encoded.code).toBe("BWNEW123");
    expect(encoded.verification).toEqual({
      matched: true,
      requestedCount: 1,
      decodedCount: 1,
      missing: [],
      unexpected: [],
    });
  });

  it("maps an invalid operator code to a stable public error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({ errorCode: 6000331, errorMessage: "BookABetInvalidCode" }, 400),
      ),
    );
    const client = new BetwayClient({ baseUrl: "https://operator.test" });

    await expect(client.decode("BWNOPE")).rejects.toMatchObject({
      status: 404,
      code: "BOOKING_CODE_NOT_FOUND",
    });
  });

  it("retries conversion when Betway initially reuses the source code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ selections: [rawSelection] }))
      .mockResolvedValueOnce(response({ bookingCode: "BWSOURCE" }))
      .mockResolvedValueOnce(response({ selections: [rawSelection] }))
      .mockResolvedValueOnce(response({ bookingCode: "BWFRESH1" }))
      .mockResolvedValueOnce(response({ selections: [rawSelection] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new BetwayClient({ baseUrl: "https://operator.test" });

    const converted = await client.convert("BWSOURCE");

    expect(converted.sourceCode).toBe("BWSOURCE");
    expect(converted.code).toBe("BWFRESH1");
    expect(converted.verification.matched).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
