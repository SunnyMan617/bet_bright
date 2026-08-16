import type {
  ConvertedSlip,
  DecodedSlip,
  EncodedSlip,
  SelectionIdentity,
  SlipLeg,
  Verification,
} from "../shared/contracts.js";
import { AppError } from "./errors.js";

type JsonRecord = Record<string, unknown>;

export type BetwayConfig = {
  baseUrl: string;
  countryCode: string;
  cultureCode: string;
  brandId: string;
  timeoutMs: number;
};

export interface SlipProvider {
  decode(code: string): Promise<DecodedSlip>;
  encode(selections: SelectionIdentity[]): Promise<EncodedSlip>;
  convert(code: string): Promise<ConvertedSlip>;
}

const DEFAULT_CONFIG: BetwayConfig = {
  baseUrl: "https://www.betway.com.ng/appsynapse/bet-api-sr02",
  countryCode: "NG",
  cultureCode: "en-US",
  brandId: "f8a8d16a-d619-4b49-aa8c-f21211403c92",
  timeoutMs: 9_000,
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(normalized)) {
    throw new AppError(
      400,
      "INVALID_CODE_FORMAT",
      "Use a 5–20 character Betway booking code containing only letters and numbers.",
    );
  }
  return normalized;
}

function identityKey(selection: SelectionIdentity): string {
  return `${selection.eventId}\u0000${selection.marketId}\u0000${selection.outcomeId}`;
}

function verifySelections(
  requested: SelectionIdentity[],
  decoded: SelectionIdentity[],
): Verification {
  const requestedKeys = new Set(requested.map(identityKey));
  const decodedKeys = new Set(decoded.map(identityKey));
  return {
    matched:
      requestedKeys.size === decodedKeys.size &&
      [...requestedKeys].every((key) => decodedKeys.has(key)),
    requestedCount: requestedKeys.size,
    decodedCount: decodedKeys.size,
    missing: requested.filter((selection) => !decodedKeys.has(identityKey(selection))),
    unexpected: decoded.filter(
      (selection) => !requestedKeys.has(identityKey(selection)),
    ),
  };
}

function epochToIso(value: unknown): string | undefined {
  const epoch = asNumber(value);
  return epoch > 0 ? new Date(epoch * 1_000).toISOString() : undefined;
}

function normalizeSelection(value: unknown): SlipLeg {
  const selection = asRecord(value);
  const event = asRecord(selection.sportEvent);
  const market = asRecord(selection.market);
  const outcome = asRecord(selection.outcome);
  const price = asRecord(selection.price);

  const odds = asNumber(price.priceDecimal, asNumber(selection.priceDecimal));
  const eventActive = asBoolean(event.isActive, asBoolean(selection.isEventActive));
  const marketActive =
    asBoolean(market.isActive, asBoolean(selection.isMarketActive)) &&
    !asBoolean(market.isSuspended);
  const outcomeActive = asBoolean(
    outcome.isTradingActive,
    asBoolean(selection.isOutcomeActive),
  );

  return {
    eventId: asNumber(event.eventId, asNumber(selection.eventId)),
    marketId: asString(market.marketId, asString(selection.marketId)),
    outcomeId: asString(outcome.outcomeId, asString(selection.outcomeId)),
    event: asString(
      event.displayName,
      asString(selection.eventName, asString(event.name, "Unknown event")),
    ),
    homeTeam: asString(event.homeTeam) || undefined,
    awayTeam: asString(event.awayTeam) || undefined,
    sport: asString(event.sportId, asString(selection.sportId, "sport")),
    league: asString(event.league, asString(selection.league, "Other")),
    region: asString(event.region, asString(selection.region, "")),
    startsAt: epochToIso(event.expectedStartEpoch ?? selection.eventEpoch),
    isLive: asBoolean(event.isLive),
    market: asString(
      market.displayName,
      asString(selection.marketName, asString(market.name, "Market")),
    ),
    selection: asString(
      outcome.displayName,
      asString(selection.outcomeName, asString(outcome.name, "Selection")),
    ),
    odds,
    isActive: eventActive && marketActive && outcomeActive && odds > 1,
  };
}

export class BetwayClient implements SlipProvider {
  private readonly config: BetwayConfig;

  constructor(config: Partial<BetwayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, "");
  }

  async decode(code: string): Promise<DecodedSlip> {
    const normalizedCode = normalizeCode(code);
    const payload = await this.request("v2/Betting/FindBookABet", {
      countryCode: this.config.countryCode,
      bookingCode: normalizedCode,
      cultureCode: this.config.cultureCode,
    });
    const rawSelections = asRecord(payload).selections;
    if (!Array.isArray(rawSelections) || rawSelections.length === 0) {
      throw new AppError(
        404,
        "BOOKING_CODE_NOT_FOUND",
        "Betway did not return any selections for that booking code.",
      );
    }

    const selections = rawSelections.map(normalizeSelection);
    const totalOdds = selections.reduce(
      (total, selection) => total * (selection.odds || 1),
      1,
    );

    return {
      code: normalizedCode,
      provider: "Betway Nigeria",
      fetchedAt: new Date().toISOString(),
      selections,
      totalOdds: Number(totalOdds.toFixed(2)),
      activeSelections: selections.filter((selection) => selection.isActive).length,
    };
  }

  async encode(selections: SelectionIdentity[]): Promise<EncodedSlip> {
    if (selections.length === 0) {
      throw new AppError(400, "NO_SELECTIONS", "Add at least one selection.");
    }
    const unique = new Map(selections.map((selection) => [identityKey(selection), selection]));
    const requested = [...unique.values()];
    const response = asRecord(
      await this.request("v1/Betting/BookABet", {
        cultureCode: this.config.cultureCode,
        countryCode: this.config.countryCode,
        isSingleBet: requested.length === 1,
        outcomes: requested.map((selection) => ({
          ...selection,
          payment: 1,
          value: 0,
          selected: true,
        })),
      }),
    );
    const code = asString(response.bookingCode).toUpperCase();
    if (!code) {
      throw new AppError(
        502,
        "CODE_NOT_CREATED",
        "Betway accepted the request but did not return a booking code.",
      );
    }

    const slip = await this.decode(code);
    const verification = verifySelections(requested, slip.selections);
    return { code, slip, verification };
  }

  async convert(code: string): Promise<ConvertedSlip> {
    const sourceSlip = await this.decode(code);
    const encoded = await this.encode(
      sourceSlip.selections.map(({ eventId, marketId, outcomeId }) => ({
        eventId,
        marketId,
        outcomeId,
      })),
    );
    return {
      ...encoded,
      sourceCode: sourceSlip.code,
      sourceSlip,
    };
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl}/${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Brand-Id": this.config.brandId,
          Origin: "https://www.betway.com.ng",
          Referer: "https://www.betway.com.ng/",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new AppError(
          502,
          "UPSTREAM_INVALID_RESPONSE",
          "Betway returned a response that could not be read.",
        );
      }

      if (!response.ok) {
        const upstream = asRecord(payload);
        const upstreamCode = asString(upstream.errorMessage);
        if (upstreamCode === "BookABetInvalidCode" || response.status === 404) {
          throw new AppError(
            404,
            "BOOKING_CODE_NOT_FOUND",
            "That booking code was not found or has expired on Betway Nigeria.",
          );
        }
        if (response.status === 429) {
          throw new AppError(503, "UPSTREAM_BUSY", "Betway is busy. Please retry shortly.");
        }
        throw new AppError(
          502,
          "BETWAY_ERROR",
          "Betway could not process the request.",
          { status: response.status, upstreamCode },
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(504, "BETWAY_TIMEOUT", "Betway took too long to respond.");
      }
      throw new AppError(
        502,
        "BETWAY_UNAVAILABLE",
        "Betway Nigeria is temporarily unreachable.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function betwayConfigFromEnvironment(): Partial<BetwayConfig> {
  const timeout = Number(process.env.BETWAY_TIMEOUT_MS);
  return {
    baseUrl: process.env.BETWAY_BASE_URL,
    countryCode: process.env.BETWAY_COUNTRY_CODE,
    cultureCode: process.env.BETWAY_CULTURE_CODE,
    brandId: process.env.BETWAY_BRAND_ID,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
  } as Partial<BetwayConfig>;
}
